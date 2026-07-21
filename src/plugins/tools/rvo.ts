import { downloadMediaMessage, type proto } from "baileys";
import type { Plugin } from "../../types";

type ViewOnceMedia = {
  media:
    | proto.Message.IImageMessage
    | proto.Message.IVideoMessage
    | proto.Message.IAudioMessage;
  type: "image" | "video" | "audio";
};

function unwrapViewOnce(
  quotedMsg: proto.IMessage | null | undefined,
): ViewOnceMedia | null {
  if (!quotedMsg) return null;

  const vo =
    quotedMsg.viewOnceMessage?.message ||
    quotedMsg.viewOnceMessageV2?.message ||
    quotedMsg.viewOnceMessageV2Extension?.message ||
    quotedMsg;

  if (vo.imageMessage) {
    return { media: vo.imageMessage, type: "image" };
  }
  if (vo.videoMessage) {
    return { media: vo.videoMessage, type: "video" };
  }
  if (vo.audioMessage) {
    return { media: vo.audioMessage, type: "audio" };
  }

  return null;
}

export default {
  name: "rvo",
  aliases: ["read", "view", "readviewonce"],
  category: "tools",
  execute: async ({ msg, sock, jid }) => {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;

    const target = unwrapViewOnce(quotedMsg);

    if (!target || !quotedMsg) {
      await sock.sendMessage(
        jid,
        { text: "Harap reply pesan sekali lihat (View Once)!" },
        { quoted: msg },
      );
      return;
    }

    try {
      const buffer = (await downloadMediaMessage(
        {
          key: {
            remoteJid: jid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant,
          },
          message: quotedMsg,
        },
        "buffer",
        {},
        {
          logger: sock.logger,
          reuploadRequest: sock.updateMediaMessage,
        },
      )) as Buffer;

      const caption =
        (target.media as proto.Message.IImageMessage).caption || undefined;

      if (target.type === "image") {
        await sock.sendMessage(
          jid,
          { image: buffer, caption },
          { quoted: msg },
        );
      } else if (target.type === "video") {
        await sock.sendMessage(
          jid,
          { video: buffer, caption },
          { quoted: msg },
        );
      } else if (target.type === "audio") {
        await sock.sendMessage(
          jid,
          {
            audio: buffer,
            ptt: (target.media as proto.Message.IAudioMessage).ptt || false,
            mimetype: "audio/mp4",
          },
          { quoted: msg },
        );
      }
    } catch (error) {
      console.error("[error] Gagal memproses RVO:", error);
      await sock.sendMessage(
        jid,
        {
          text: "Gagal mengunduh media. File mungkin sudah kedaluwarsa atau tidak valid.",
        },
        { quoted: msg },
      );
    }
  },
} satisfies Plugin;
