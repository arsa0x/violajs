import { defineCommand } from "@core/command";
import {
  apiGet, externalJson, firstString, getInput, requireUrl, runDownloader, sendImage, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "instagram",
  aliases: ["ig", "igdl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .ig https://www.instagram.com/p/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["instagram.com", "instagr.am"]);
      let items: any[] = [];

      try {
        const data = await apiGet("/api/download/instagram", { url }, 20_000);
        const result = data?.result;
        if (data.status && Array.isArray(result)) items = result;
        else if (data.status && result?.url) items = [result];
      } catch {
        // Coba penyedia alternatif di bawah.
      }

      if (!items.length) {
        const fallback = await externalJson(`https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(url)}`, 15_000);
        if (Array.isArray(fallback.result)) items = fallback.result;
      }

      if (!items.length) throw new Error("Instagram tidak mengembalikan media.");
      for (const item of items.slice(0, 10)) {
        const mediaUrl = typeof item === "string" ? item : firstString(item?.url, item?.downloadUrl);
        if (!mediaUrl) continue;
        if (/\.mp4(?:[?#]|$)/i.test(mediaUrl) || item?.type === "video") {
          await sendVideo(ctx, mediaUrl, "✅ Instagram Video");
        } else {
          await sendImage(ctx, mediaUrl, "✅ Instagram Photo");
        }
      }
    }, "Gagal mengunduh Instagram. Pastikan postingan publik.");
  },
});
