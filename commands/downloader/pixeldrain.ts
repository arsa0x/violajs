import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendDocument,
} from "@lib/downloader";

export default defineCommand({
  name: "pixeldrain",
  aliases: ["pxl", "pxldl"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .pixeldrain https://pixeldrain.com/u/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["pixeldrain.com"]);
      const data = await apiGet("/api/download/pixeldrain", { url });
      if (!data.status) throw new Error(firstString(data.error) ?? "API gagal memproses URL.");

      const result = data.result ?? data;
      const directUrl = firstString(result.directUrl, result.url, result.downloadUrl);
      if (!directUrl) throw new Error("Direct link tidak ditemukan.");
      const fileName = firstString(result.fileName, result.title) ?? "pixeldrain_file";
      await ctx.send.text(`📁 *Pixeldrain*\n📄 ${fileName}\n📦 Ukuran: ${firstString(result.fileSize, result.size) ?? "-"}\n⏳ Mengirim berkas...`);
      await sendDocument(ctx, directUrl, fileName, firstString(result.mimeType) ?? "application/octet-stream");
    }, "Gagal mengunduh Pixeldrain.");
  },
});
