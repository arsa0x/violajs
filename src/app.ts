import { createSessionLogger } from "@lib/logger";
import { extractInteractiveResponse } from "@lib/interactive";
import { config } from "../config";
import { CommandContext } from "./core/context";
import { CommandDispatcher } from "./core/dispatcher";
import { parseCommand } from "./core/parser";
import { CommandRegistry } from "./core/registry";
import { createWAClient } from "./core/socket";
import { cli, type BotOptions } from "./cli";
import { EventRegistry } from "./core/events/registry";
import { EventDispatcher } from "./core/events/dispatcher";
import { attachBaileysEventAdapter } from "./core/events/adapter";

const sessionPath = "./sessions";

export async function startApp(
  registry: CommandRegistry,
  eventRegistry: EventRegistry,
): Promise<void> {
  cli(bot, registry, eventRegistry, sessionPath);
}

async function bot(
  registry: CommandRegistry,
  eventRegistry: EventRegistry,
  name: string,
  options?: BotOptions,
) {
  const log = createSessionLogger(name);

  log.info(`Loaded ${registry.list().length} commands`);
  log.info(`Loaded ${eventRegistry.list().length} event plugins`);

  const dispatcher = new CommandDispatcher(registry, [
    // logger()
  ]);
  const sock = await createWAClient(name, log, options);
  const eventDispatcher = new EventDispatcher(eventRegistry, sock, log);

  attachBaileysEventAdapter(sock, eventDispatcher);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      const jid = message.key.remoteJid;
      if (!jid) continue;

      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        extractInteractiveResponse(message) ||
        "";

      const senderJid = message.key.participant ?? jid;

      await eventDispatcher.dispatch("message.received", {
        message,
        text,
        chat: {
          jid,
          isGroup: jid.endsWith("@g.us"),
        },
        sender: {
          jid: senderJid,
        },
      });

      if (!text) continue;

      const parsed = parseCommand(text, config.prefix);
      if (!parsed) continue;

      const ctx = new CommandContext({
        sock,
        message,
        text,
        parsed,
        jid,
        log,
      });

      try {
        await dispatcher.dispatch(ctx);
      } catch (error) {
        log.error(`Command ${parsed.name} failed: ${error}`);
        await ctx.send.text("Terjadi error saat menjalankan command.");
      }
    }
  });
}
