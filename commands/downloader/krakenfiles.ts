import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendDocument,
} from "@lib/downloader";

export default defineCommand({
  name: "krakenfiles",
  aliases: ["kraken", "krakendl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .krakenfiles https://krakenfiles.com/view/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["krakenfiles.com"]);
      const data = await apiGet("/api/download/krakenfiles", { url });
      if (!data.status) throw new Error(firstString(data.error) ?? "API gagal memproses URL.");

      const result = data.result ?? data;
      const directUrl = firstString(result.directUrl, result.url, result.downloadUrl);
      if (!directUrl) throw new Error("Direct link tidak ditemukan.");
      const fileName = firstString(result.fileName, result.title) ?? "kraken_file";
      const mime = firstString(result.mimeType) ?? "application/octet-stream";

      await ctx.send.text(`📁 *KrakenFiles*\n📄 ${fileName}\n📦 Ukuran: ${firstString(result.fileSize, result.size) ?? "-"}\n⏳ Mengirim berkas...`);
      await sendDocument(ctx, directUrl, fileName, mime);
    }, "Gagal mengunduh berkas KrakenFiles.");
  },
});
