import { config } from "../config";
import { Context } from "./core/context";
import { CommandDispatcher } from "./core/dispatcher";
import { parseCommand } from "./core/parser";
import { CommandRegistry } from "./core/registry";
import { createWAClient } from "./core/socket";

export async function startApp(registry: CommandRegistry): Promise<void> {
  console.log(`Loaded ${registry.list().length} commands`);

  const dispatcher = new CommandDispatcher(registry);
  const sock = await createWAClient();

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        message.message?.buttonsResponseMessage?.selectedButtonId ||
        message.message?.listResponseMessage?.singleSelectReply
          ?.selectedRowId ||
        message.message?.templateButtonReplyMessage?.selectedId ||
        message.message?.interactiveResponseMessage?.nativeFlowResponseMessage
          ?.paramsJson ||
        "";

      if (!text) continue;

      const parsed = parseCommand(text, config.prefix);
      if (!parsed) continue;

      const jid = message.key.remoteJid;
      if (!jid) continue;

      const ctx = new Context({
        sock,
        message,
        text,
        parsed,
        jid,
      });

      try {
        await dispatcher.dispatch(ctx);
      } catch (error) {
        console.error(`Command ${parsed.name} failed:`, error);
        await ctx.reply.text("Terjadi error saat menjalankan command.");
      }
    }
  });
}
