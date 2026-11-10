import { defineCommand } from "@core/command";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";

function parseMediaFireUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL tidak valid. Gunakan tautan MediaFire lengkap.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !(
      url.hostname === "mediafire.com" ||
      url.hostname.endsWith(".mediafire.com")
    )
  ) {
    throw new Error("Masukkan tautan dari mediafire.com.");
  }
  return url;
}

export default defineCommand({
  name: "mediafire",
  aliases: ["mf", "mfire"],
  category: "downloader",
  description: "Resolve a public MediaFire file link",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .mediafire <url MediaFire>");
      return;
    }

    try {
      const pageUrl = parseMediaFireUrl(input);
      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        throw new Error(`MediaFire membalas HTTP ${response.status}.`);
      }
      const finalUrl = new URL(response.url);
      if (!(
        finalUrl.hostname === "mediafire.com" ||
        finalUrl.hostname.endsWith(".mediafire.com")
      )) {
        throw new Error("Tautan dialihkan ke domain yang tidak dikenal.");
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const title =
        $("div.dl-btn-label").first().text().trim() ||
        $("meta[property='og:title']").attr("content") ||
        $("title").text().trim() ||
        "File MediaFire";

      const candidate =
        $("#downloadButton").attr("href") ||
        $("a.input").attr("href") ||
        $("a.download_link").attr("href") ||
        $("[data-scrapable-href]").first().attr("data-scrapable-href");

      if (!candidate) {
        throw new Error(
          "Tautan unduhan tidak ditemukan. File mungkin dihapus, privat, atau halaman berubah.",
        );
      }

      const downloadUrl = new URL(candidate, response.url);
      if (
        !["http:", "https:"].includes(downloadUrl.protocol) ||
        !(
          downloadUrl.hostname === "mediafire.com" ||
          downloadUrl.hostname.endsWith(".mediafire.com")
        )
      ) {
        throw new Error(
          "Tautan unduhan yang dikembalikan bukan domain MediaFire.",
        );
      }

      await ctx.send.text(
        `*MediaFire: ${title}*\n\nTautan unduhan:\n${downloadUrl.href}`,
      );
    } catch (error) {
      ctx.log.warn("MediaFire resolver failed", error);
      await ctx.send.text(
        error instanceof Error
          ? `Gagal resolve MediaFire: ${error.message}`
          : "Gagal resolve tautan MediaFire.",
      );
    }
  },
});
