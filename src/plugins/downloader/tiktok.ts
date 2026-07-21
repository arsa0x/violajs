import type { Plugin } from "../../types";

interface TikTokResponse {
  status: boolean;
  author: string;
  videoId: string;
  audioId: string;
}

export default {
  name: "tiktok",
  aliases: ["tt", "tik"],
  category: "downloader",
  description: "Tiktok video and audio downloader",
  execute: async (ctx) => {
    const urlArg = ctx.args.find((arg) => arg.includes("https://"));

    const isAudioOnly = ctx.args.some((arg) =>
      ["--mp3", "--audio", "-mp3", "-audio"].includes(arg.toLowerCase()),
    );

    if (!urlArg) {
      await ctx.sock.sendMessage(
        ctx.jid,
        { text: "Penggunaan: .tiktok [-mp3] <url_tiktok>" },
        { quoted: ctx.msg },
      );
      return;
    }

    try {
      const apiUrl = new URL("https://www.tiktokdl.web.id/api/tiktok");
      apiUrl.searchParams.append("url", urlArg);

      const response = await fetch(apiUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`API merespons dengan status: ${response.status}`);
      }

      const data = (await response.json()) as TikTokResponse;

      if (!data.status) {
        await ctx.sock.sendMessage(
          ctx.jid,
          { text: "Gagal. Video mungkin diprivasi atau URL tidak valid." },
          { quoted: ctx.msg },
        );
        return;
      }

      if (isAudioOnly) {
        const decodedAudioUrl = Buffer.from(data.audioId, "base64").toString(
          "utf-8",
        );

        await ctx.sock.sendMessage(
          ctx.jid,
          {
            audio: { url: decodedAudioUrl },
            mimetype: "audio/mpeg",
          },
          { quoted: ctx.msg },
        );
      } else {
        const decodedVideoUrl = Buffer.from(data.videoId, "base64").toString(
          "utf-8",
        );

        await ctx.sock.sendMessage(
          ctx.jid,
          {
            video: { url: decodedVideoUrl },
            caption: `Author: ${data.author}`,
          },
          { quoted: ctx.msg },
        );
      }
    } catch (error: any) {
      console.error("[error]:", error);
      await ctx.sock.sendMessage(
        ctx.jid,
        { text: `Terjadi kesalahan sistem: ${error.message}` },
        { quoted: ctx.msg },
      );
    }
  },
} satisfies Plugin;
