import { defineCommand } from "@core/command";
import { downloadMediaMessage } from "baileys";

export default defineCommand({
  name: "sticker",
  aliases: ["s", "stiker"],
  execute: async (ctx) => {
    const imgMessage = ctx.msg.message?.imageMessage;

    if (!imgMessage || imgMessage === null || imgMessage === undefined) {
      return;
    }

    const media = await downloadMediaMessage(ctx.msg, "buffer", {});
    const webp = new Bun.Image(media).webp();
    webp.resize(512);
    const buffer = await webp.buffer();
    ctx.reply.sticker(buffer);
  },
});
