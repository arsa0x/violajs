import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendAudio,
} from "@lib/downloader";

export default defineCommand({
  name: "play",
  aliases: ["ytmp3", "ytplay"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Masukkan judul lagu atau URL YouTube.\nContoh: .play Evaluasi - Hindia");
      return;
    }

    await runDownloader(ctx, async () => {
      let targetUrl: string;
      let title = "";
      let channel = "";
      let duration = "";
      let views = "";

      if (/^https?:\/\//i.test(input)) {
        targetUrl = requireUrl(input, ["youtube.com", "youtu.be"]);
      } else {
        const search = await apiGet("/api/search/yts", { q: input }, 15_000);
        const results = search.results;
        if (!search.status || !Array.isArray(results) || !results.length) {
          throw new Error("Lagu tidak ditemukan.");
        }
        const first = results[0];
        targetUrl = firstString(first.url) ?? (first.id ? `https://youtu.be/${first.id}` : "");
        if (!targetUrl) throw new Error("URL hasil pencarian tidak tersedia.");
        title = firstString(first.title) ?? input;
        channel = typeof first.channel === "object" ? firstString(first.channel?.name) ?? "" : String(first.channel ?? "");
        duration = typeof first.duration === "object" ? firstString(first.duration?.text) ?? "" : String(first.duration ?? "");
        views = firstString(first.views) ?? (first.view_count ? Number(first.view_count).toLocaleString("id-ID") : "");
      }

      const download = await apiGet("/api/download/ytmp3", { url: targetUrl }, 35_000);
      const result = download.result;
      if (!download.status || !result) throw new Error("Audio YouTube tidak tersedia.");
      const audioUrl = firstString(result.downloadUrl, result.url, result.download);
      if (!audioUrl) throw new Error("URL audio tidak ditemukan.");
      title ||= firstString(result.title) ?? "YouTube Audio";

      await ctx.send.text([`🎵 *${title}*`, channel ? `» Channel: ${channel}` : "", duration ? `» Durasi: ${duration}` : "", views ? `» Views: ${views}` : "", `» Link: ${targetUrl}`].filter(Boolean).join("\n"));
      await sendAudio(ctx, audioUrl, `${title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120)}.mp3`);
    }, "Gagal mengunduh audio. Pastikan judul atau tautan YouTube valid.");
  },
});
