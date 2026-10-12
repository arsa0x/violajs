import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendDocument, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "mp4upload",
  aliases: ["mp4u", "mp4uploaddl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .mp4upload https://www.mp4upload.com/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["mp4upload.com"]);
      const data = await apiGet("/api/download/mp4upload", { url });
      if (!data.status) throw new Error(firstString(data.error) ?? "API gagal memproses URL.");

      const result = data.result ?? data;
      const directUrl = firstString(result.directUrl, result.url, result.downloadUrl);
      if (!directUrl) throw new Error("Direct link video tidak ditemukan.");
      const fileName = firstString(result.fileName, result.title) ?? "video.mp4";
      try {
        await sendVideo(ctx, directUrl, `🎬 ${fileName}`);
      } catch {
        await sendDocument(ctx, directUrl, fileName, firstString(result.mimeType) ?? "video/mp4");
      }
    }, "Gagal mengunduh MP4Upload.");
  },
});
