import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { normalizeMessageContent, type WAMessage } from "baileys";
import { sendAudioSticker } from "@lib/sound-sticker";

export default defineCommand({
  name: "saudio",
  aliases: ["audiosticker"],
  description: "Create an animated sticker with sound from a video.",
  category: "tools",
  usage: [
    ".saudio (reply to a video)",
    ".saudio --start 2 --duration 6 (reply to a video)",
  ],
  flags: [
    FlagSpec.value(["--start"]).description(
      "Start position in seconds (default: 0).",
    ),
    FlagSpec.value(["--duration", "-d"]).description(
      "Sticker duration in seconds (maximum: 10, default: 10).",
    ),
  ],
  execute: async (ctx) => {
    const content = normalizeMessageContent(ctx.msg.message);
    const contextInfo =
      content?.extendedTextMessage?.contextInfo ??
      content?.videoMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;
    const quotedContent = normalizeMessageContent(quoted);

    let source: WAMessage | undefined;
    if (content?.videoMessage) {
      source = ctx.msg;
    } else if (quotedContent?.videoMessage && contextInfo?.stanzaId) {
      source = {
        key: {
          remoteJid: ctx.chat.jid,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant,
        },
        message: quoted,
      } as WAMessage;
    }

    if (!source) {
      await ctx.send.text(
        "Reply pesan video dengan command ini, atau kirim video dengan caption .saudio.",
      );
      return;
    }

    const start = Number(ctx.args?.value("--start") ?? 0);
    const duration = Number(ctx.args?.value("--duration") ?? 10);
    if (!Number.isFinite(start) || start < 0) {
      await ctx.send.text("Nilai --start harus berupa angka 0 atau lebih.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      await ctx.send.text("Nilai --duration harus berupa angka lebih dari 0.");
      return;
    }

    await ctx.send.reaction("⏳");
    try {
      await sendAudioSticker(ctx.sock, ctx.chat.jid, source, {
        quoted: ctx.msg,
        startSeconds: start,
        durationSeconds: duration,
      });
      await ctx.send.reaction("✅");
    } catch (error) {
      ctx.log.warn("Audio sticker generation failed:", error);
      await ctx.send.reaction("❌");

      const message =
        error instanceof Error ? error.message : String(error);
      if (/not installed|unavailable on PATH|unknown encoder/i.test(message)) {
        await ctx.send.text(
          "Gagal membuat audio sticker. Pastikan FFmpeg (termasuk FFprobe) terpasang dan mendukung encoder libwebp_anim serta libopus.",
        );
      } else {
        await ctx.send.text(
          message.includes("audio track")
            ? "Video tersebut tidak memiliki audio. Gunakan video yang memiliki suara."
            : "Gagal membuat audio sticker. Pastikan video valid dan durasinya tidak lebih dari batas yang didukung.",
        );
      }
    }
  },
});
