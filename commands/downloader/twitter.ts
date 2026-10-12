import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendImage, sendVideo,
} from "@lib/downloader";

export default defineCommand({
  name: "twitter",
  aliases: ["twit", "xdl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .twitter https://x.com/user/status/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["twitter.com", "x.com"]);
      const data = await apiGet("/api/download/twitter", { url }, 20_000);
      const result = data.result;
      if (!data.status || !result) throw new Error("Media Twitter/X tidak ditemukan.");
      const mediaUrl = firstString(result.url, result.video, result.HD, result.SD);
      if (!mediaUrl) throw new Error("URL media tidak ditemukan.");

      const caption = `🐦 *Twitter / X*\n\n${firstString(result.caption) ?? ""}`;
      if (/\.mp4(?:[?#]|$)/i.test(mediaUrl) || result.video || result.HD || result.SD) {
        await sendVideo(ctx, mediaUrl, caption);
      } else {
        await sendImage(ctx, mediaUrl, caption);
      }
    }, "Gagal mengunduh media Twitter/X.");
  },
});
