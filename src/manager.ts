import { readdirSync } from "fs";
import { join } from "path";
import type { Context, Plugin } from "./types";
import type { proto } from "baileys";

export class Manager {
  private plugins = new Map<string, Plugin>();

  async load() {
    const pluginDir = join(import.meta.dir, "plugins");
    let total: number = 0;

    for (const folder of readdirSync(pluginDir)) {
      const featureDir = join(pluginDir, folder);

      const files = readdirSync(featureDir).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js"),
      );

      for (const file of files) {
        total += 1;
        const mod = await import(join(featureDir, file));
        const plugin: Plugin = mod.default;

        if (!plugin || !plugin.name) continue;

        this.plugins.set(plugin.name.toLowerCase(), plugin);

        if (plugin.aliases)
          for (const alias of plugin.aliases) {
            this.plugins.set(alias.toLowerCase(), plugin);
          }
      }
    }

    console.log(`[info] ${total} plugin berhasil dimuat.`);
  }

  getTextContent(msg: proto.IMessage | null | undefined): string | null {
    if (!msg) return null;

    return (
      msg.conversation ??
      msg.extendedTextMessage?.text ??
      msg.imageMessage?.caption ??
      msg.videoMessage?.caption ??
      msg.documentMessage?.caption ??
      msg.interactiveMessage?.body?.text ??
      this.getTextContent(msg.viewOnceMessage?.message) ??
      this.getTextContent(msg.viewOnceMessageV2?.message) ??
      this.getTextContent(msg.ephemeralMessage?.message) ??
      null
    );
  }

  async dispatch(ctx: Context, cmd: string) {
    const plugin = this.plugins.get(cmd);
    if (!plugin) return;

    if (plugin.groupOnly && !ctx.jid.endsWith("@g.us")) {
      return await ctx.sock.sendMessage(ctx.jid, {
        text: "group only plugin",
      });
      // to do: owner only plugin
    }
    try {
      await plugin.execute(ctx);
    } catch (e) {
      console.error(`[error] ${e}`);
      await ctx.sock.sendMessage(ctx.jid, {
        text: `error: ${e}`,
      });
    }
  }
}
