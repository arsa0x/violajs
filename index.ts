import { config } from "./config";
import { CommandDispatcher } from "./src/core/dispatcher";
import { loadCommands } from "./src/core/loader";
import { parseCommand } from "./src/core/parser";
import { CommandRegistry } from "./src/core/registry";
import { createWAClient } from "./src/core/socket";
import type { Context } from "./src/types/context";

const registry = new CommandRegistry();
await loadCommands(registry);

console.log(`Loaded ${registry.list().length} commands`);
for (const command of registry.list()) {
  console.log(`  .${command.name}`);
}

const dispatcher = new CommandDispatcher(registry);
const sock = await createWAClient();

sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") return;

  for (const message of messages) {
    if (!message.message || message.key.fromMe) continue;

    const text =
      message.message.conversation ?? message.message.extendedTextMessage?.text;

    if (!text) continue;

    const parsed = parseCommand(text, config.prefix);
    if (!parsed) continue;

    const jid = message.key.remoteJid;
    if (!jid) continue;

    const senderJid = message.key.participant ?? jid;

    const ctx: Context = {
      name: parsed.name,
      args: parsed.args,
      text,
      sender: {
        jid: senderJid,
        isOwner: config.owners.has(senderJid),
      },
      chat: {
        jid,
        isGroup: jid.endsWith("@g.us"),
      },
      reply: {
        text: (body: string) =>
          sock.sendMessage(jid, { text: body }, { quoted: message }),
      },
    };

    try {
      await dispatcher.dispatch(ctx);
    } catch (error) {
      console.error(`Command ${parsed.name} failed:`, error);
      await ctx.reply.text("Terjadi error saat menjalankan command.");
    }
  }
});
