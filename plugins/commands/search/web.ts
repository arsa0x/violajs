import { defineCommand } from "@core/command";
import * as cheerio from "cheerio";

const ENDPOINT = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";

type SearchResult = { title: string; url: string; snippet: string };

function normalizeResultUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw, ENDPOINT);
    if (url.hostname.endsWith("duckduckgo.com")) {
      const target = url.searchParams.get("uddg");
      if (target) {
        const decoded = new URL(target);
        return ["http:", "https:"].includes(decoded.protocol)
          ? decoded.href
          : undefined;
      }
      return;
    }
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return;
  }
}

export default defineCommand({
  name: "search",
  aliases: ["websearch", "ddg"],
  category: "search",
  description: "Search the web and return the first few results",
  async execute(ctx) {
    const query = ctx.rawArgs.join(" ").trim();
    if (!query) {
      await ctx.send.text("Penggunaan: .search <kata kunci>");
      return;
    }
    if (query.length > 300) {
      await ctx.send.text(
        "Kata kunci terlalu panjang (maksimal 300 karakter).",
      );
      return;
    }

    try {
      const endpoint = new URL(ENDPOINT);
      endpoint.searchParams.set("q", query);
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error(`Mesin pencari membalas HTTP ${response.status}.`);

      const $ = cheerio.load(await response.text());
      const results: SearchResult[] = [];
      $(".result").each((_index, element) => {
        if (results.length >= 5) return false;
        const item = $(element);
        const anchor = item.find(".result__title a").first();
        const title = anchor.text().replace(/\s+/g, " ").trim();
        const href = anchor.attr("href");
        const url = href ? normalizeResultUrl(href) : undefined;
        const snippet = item
          .find(".result__snippet")
          .text()
          .replace(/\s+/g, " ")
          .trim();
        if (title && url) results.push({ title, url, snippet });
        return;
      });

      if (!results.length) {
        await ctx.send.text(
          "Tidak ada hasil yang bisa dibaca. Coba kata kunci lain atau ulangi beberapa saat lagi.",
        );
        return;
      }

      const output = results.map(
        (result, index) =>
          `${index + 1}. *${result.title}*\n${result.url}${result.snippet ? `\n${result.snippet}` : ""}`,
      );
      await ctx.send.text(
        `Hasil pencarian: *${query}*\n\n${output.join("\n\n")}`,
      );
    } catch (error) {
      ctx.log.warn("Web search failed", error);
      await ctx.send.text(
        error instanceof Error
          ? `Pencarian gagal: ${error.message}`
          : "Pencarian gagal.",
      );
    }
  },
});
