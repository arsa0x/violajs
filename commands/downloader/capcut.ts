import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "capcut",
  aliases: ["capcutdl", "cc", "ccdl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .capcut https://www.capcut.com/tv2/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["capcut.com", "capcut.net"]);
      const data = await apiGet("/api/download/capcut", { url }, 30_000);
      const media = data?.result?.data;
      if (!data.status || !media) throw new Error("CapCut API tidak mengembalikan media.");

      const candidates = Array.isArray(media.mediaUrls) ? media.mediaUrls : [];
      const selected = candidates.find((item: any) => item?.quality === "hd_no_watermark")
        ?? candidates.find((item: any) => item?.quality === "no_watermark")
        ?? candidates.find((item: any) => item?.type === "video" || item?.format === "mp4")
        ?? candidates[0];

      const mediaUrl = firstString(selected?.url);
      if (!mediaUrl) throw new Error("Video CapCut tidak ditemukan.");
      await sendVideo(ctx, mediaUrl, `*CapCut Downloader*\n\n📌 Judul: ${firstString(media.title) ?? "CapCut Video"}`);
    }, "Gagal mengunduh CapCut. Pastikan tautannya publik dan API downloader tersedia.");
  },
});
