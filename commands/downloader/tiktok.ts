import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendAudio, sendImage, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "tiktok",
  aliases: ["tt", "ttdl", "tiktokdl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .tt https://vt.tiktok.com/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["tiktok.com", "douyin.com"]);
      const data = await apiGet("/api/download/tiktok", { url }, 25_000);
      const result = data.result;
      if (!data.status || !result) throw new Error("TikTok API tidak mengembalikan media.");

      const title = firstString(result.description, result.title) ?? "";
      const author = firstString(result.author?.nickname) ?? "Creator";
      if (result.type === "photo" && Array.isArray(result.media?.photos)) {
        const photos = result.media.photos.slice(0, 10);
        for (let index = 0; index < photos.length; index++) {
          const photo = photos[index];
          if (typeof photo !== "string") continue;
          await sendImage(ctx, photo, index === 0 ? `📸 *TikTok Slide*\n${title}\n👤 ${author}` : `Foto ${index + 1}/${photos.length}`);
        }
      } else {
        const video = result.media?.video;
        const videoUrl = firstString(video?.directStreamUrl, video?.downloadUrl);
        if (!videoUrl) throw new Error("Video TikTok tidak ditemukan.");
        await sendVideo(ctx, videoUrl, [ "🎵 *TikTok Downloader*", title, `👤 ${author}` ].filter(Boolean).join("\n\n"));
      }

      const audioUrl = result.type === "photo" ? firstString(result.music?.playUrl) : undefined;
      if (audioUrl) {
        try {
          await sendAudio(ctx, audioUrl, "tiktok-audio.mp3");
        } catch (error) {
          console.warn("[DOWNLOADER:tiktok] Gagal mengirim audio tambahan", error);
        }
      }
    }, "Gagal mengunduh TikTok. Pastikan tautan valid dan publik.");
  },
});
