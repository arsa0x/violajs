import { defineCommand } from "@core/command";
import { downloadMediaMessage, type WAMessage } from "baileys";

export default defineCommand({
  name: "sticker",
  aliases: ["s", "stiker"],
  execute: async (ctx) => {
    const imgMessage: WAMessage | null = ctx.msg.message?.imageMessage
      ? ctx.msg
      : ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            ?.imageMessage
        ? {
            key: {
              remoteJid: ctx.msg.key.remoteJid,
              id: ctx.msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
              participant:
                ctx.msg.message?.extendedTextMessage?.contextInfo?.participant,
            },
            message:
              ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
          }
        : null;

    if (!imgMessage || imgMessage === null || imgMessage === undefined) {
      return;
    }

    const media = await downloadMediaMessage(imgMessage, "buffer", {});
    const webp = new Bun.Image(media).webp();
    webp.resize(512);
    const buffer = await webp.buffer();
    ctx.send.sticker(buffer);
  },
});
