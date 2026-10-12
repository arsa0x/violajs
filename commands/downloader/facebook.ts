import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendAudio, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "facebook",
  aliases: ["fb"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .fb https://www.facebook.com/reel/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["facebook.com", "fb.watch", "fb.com"]);
      const data = await apiGet("/api/download/facebook", { url });
      const links = data?.downloads?.links;
      if (!data.status || !Array.isArray(links) || !links.length) {
        throw new Error("Media Facebook tidak ditemukan.");
      }

      const video = links.find((item: any) => ["HD", "720p", "1080p"].includes(item?.type) || ["720p", "1080p"].includes(item?.quality))
        ?? links.find((item: any) => item?.type !== "Audio" && item?.url);
      const audio = links.find((item: any) => item?.type === "Audio" || item?.quality === "Mp3");
      const metadata = data.metadata ?? {};

      if (!video?.url) throw new Error("Video Facebook tidak ditemukan.");
      const caption = [
        "*Facebook Downloader*",
        `📌 Judul: ${firstString(metadata.title) ?? "-"}`,
        `👤 Author: ${firstString(metadata.author) ?? "-"}`,
        `⏱️ Durasi: ${firstString(metadata.duration) ?? "-"}`,
        `📺 Kualitas: ${firstString(video.quality, video.type) ?? "SD"}`,
      ].join("\n");
      await sendVideo(ctx, video.url, caption);
      if (audio?.url) await sendAudio(ctx, audio.url, "facebook-audio.mp3");
    }, "Gagal mengunduh Facebook. Pastikan tautannya publik.");
  },
});
