import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "ytmp4",
  aliases: ["ytv"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .ytmp4 https://youtu.be/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["youtube.com", "youtu.be"]);
      const data = await apiGet("/api/download/ytmp4", { url }, 30_000);
      const result = data.result;
      if (!data.status || !result) throw new Error("Video YouTube tidak ditemukan.");
      const mediaUrl = firstString(result.download, result.url, result.link);
      if (!mediaUrl) throw new Error("URL video tidak ditemukan.");
      await sendVideo(ctx, mediaUrl, `🎥 *YouTube MP4*\n\n📌 Judul: ${firstString(result.title) ?? "YouTube Video"}`);
    }, "Gagal mengunduh YouTube. Pastikan tautan valid.");
  },
});
