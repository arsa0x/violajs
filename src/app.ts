import { createSessionLogger, log } from "@lib/logger";
import { extractInteractiveResponse } from "@lib/interactive";
import { config } from "@/config";
import { CommandContext } from "@core/context";
import { CommandDispatcher } from "@core/command/dispatcher";
import { parseCommand } from "@core/parser";
import { CommandRegistry } from "@core/command/registry";
import { cli, type BotOptions } from "./cli";
import { EventRegistry } from "@core/events/registry";
import { EventDispatcher } from "@core/events/dispatcher";
import { attachBaileysEventAdapter } from "@core/events/adapter";
import { normalizeMessageContent, type WAMessage } from "baileys";
import { Session } from "@core/session";
import { TtlCache } from "@src/storage/cache";
import { Semaphore } from "./core/semaphore";

export async function startApp(
  registry: CommandRegistry,
  eventRegistry: EventRegistry,
): Promise<void> {
  const sessions: Session[] = [];
  const track = (p: Promise<Session>) =>
    p
      .then((s) => sessions.push(s))
      .catch((e) => log.error("Session failed to start:", e));

  process.on("unhandledRejection", (r) => log.error("Unhandled rejection:", r));
  process.on("uncaughtException", (e) => log.error("Uncaught exception:", e));

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.once(sig, async () => {
      log.info(sig, "received, shutting down...");

      await Promise.allSettled(sessions.map((s) => s.stop()));

      process.exit(0);
    });
  }

  cli(
    (...args) => track(bot(...args)),
    registry,
    eventRegistry,
    config.session_path,
  );
}

const toSeconds = (t: WAMessage["messageTimestamp"]): number =>
  typeof t === "number"
    ? t
    : ((t as { toNumber?: () => number } | null)?.toNumber?.() ?? 0);

function extractText(m: WAMessage): string {
  const c = normalizeMessageContent(m.message);
  if (!c) return "";
  return (
    c.conversation ||
    c.extendedTextMessage?.text ||
    c.imageMessage?.caption ||
    c.videoMessage?.caption ||
    c.documentMessage?.caption ||
    extractInteractiveResponse({ ...m, message: c } as WAMessage) ||
    ""
  );
}

async function bot(
  registry: CommandRegistry,
  eventRegistry: EventRegistry,
  name: string,
  options?: BotOptions,
): Promise<Session> {
  const log = createSessionLogger(name);
  const session = new Session(name, log, options);
  const dispatcher = new CommandDispatcher(registry, []);
  const limiter = new Semaphore(8);
  const seen = new TtlCache(5_000, 2 * 60_000);
  const MAX_AGE_S = 120;

  session.bind((sock) => {
    const eventDispatcher = new EventDispatcher(eventRegistry, sock, log);
    attachBaileysEventAdapter(sock, eventDispatcher);

    const handle = async (message: WAMessage) => {
      const jid = message.key.remoteJid;
      if (!jid || !message.message || message.key.fromMe) return;
      if (jid === "status@broadcast" || jid.endsWith("@newsletter")) return;

      const dedupeKey = `${jid}:${message.key.id}`;
      if (seen.get(dedupeKey)) return;
      seen.set(dedupeKey, true);
      if (Date.now() / 1000 - toSeconds(message.messageTimestamp) > MAX_AGE_S)
        return;

      const text = extractText(message);
      const senderJid = message.key.participant ?? jid;

      await eventDispatcher.dispatch("message.received", {
        message,
        text,
        chat: { jid, isGroup: jid.endsWith("@g.us") },
        sender: { jid: senderJid },
      });

      const parsed = text ? parseCommand(text, config.prefix) : null;
      if (!parsed) return;

      const ctx = new CommandContext({ sock, message, text, parsed, jid, log });
      try {
        await dispatcher.dispatch(ctx);
      } catch (error) {
        log.error(`Command ${parsed.name} failed:`, error);
        await ctx.send
          .text("Terjadi error saat menjalankan command.")
          .catch(() => {});
      }
    };

    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) {
        void limiter
          .run(() => handle(m))
          .catch((e) => log.error("Message handler crashed:", e));
      }
    });
  });

  await session.start();
  return session;
}
