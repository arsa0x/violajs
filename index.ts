import { config } from "./config";
import { Context } from "./src/core/context";
import { CommandDispatcher } from "./src/core/dispatcher";
import { loadCommands } from "./src/core/loader";
import { parseCommand } from "./src/core/parser";
import { CommandRegistry } from "./src/core/registry";
import { createWAClient } from "./src/core/socket";

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

    const ctx = new Context({ sock, message, text, parsed, jid });

    try {
      await dispatcher.dispatch(ctx);
    } catch (error) {
      console.error(`Command ${parsed.name} failed:`, error);
      await ctx.reply("Terjadi error saat menjalankan command.");
    }
  }
});
