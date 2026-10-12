import { defineCommand } from "@core/command";
import {
  apiGet, firstString, getInput, requireUrl, runDownloader, sendDocument,
} from "@lib/downloader";

export default defineCommand({
  name: "mediafire",
  aliases: ["mf"],
  category: "downloader",
  async execute(ctx) {
    const input = getInput(ctx);
    if (!input) {
      await ctx.send.text("Contoh: .mf https://www.mediafire.com/file/...");
      return;
    }

    await runDownloader(ctx, async () => {
      const url = requireUrl(input, ["mediafire.com"]);
      const data = await apiGet("/api/download/mediafire", { url });
      const result = data.result;
      if (!data.status || !result) throw new Error("File MediaFire tidak ditemukan.");

      const directUrl = firstString(result.link, result.url, result.downloadUrl);
      if (!directUrl) throw new Error("Link unduhan tidak ditemukan.");
      const fileName = firstString(result.title, result.fileName) ?? "mediafire_file";
      const ext = fileName.match(/\.([a-z\d]+)$/i)?.[1]?.toLowerCase();
      const mimeMap: Record<string, string> = {
        zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
        pdf: "application/pdf", apk: "application/vnd.android.package-archive",
        mp4: "video/mp4", mp3: "audio/mpeg", jpg: "image/jpeg", jpeg: "image/jpeg",
        png: "image/png", webp: "image/webp", txt: "text/plain",
      };

      await ctx.send.text(`📁 *MediaFire*\n📄 ${fileName}\n📦 Ukuran: ${firstString(result.size) ?? "-"}\n⏳ Mengirim berkas...`);
      await sendDocument(ctx, directUrl, fileName, firstString(result.mime) ?? mimeMap[ext ?? ""] ?? "application/octet-stream");
    }, "Gagal mengunduh MediaFire. Pastikan link masih aktif.");
  },
});
