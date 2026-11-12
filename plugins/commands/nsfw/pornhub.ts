import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import {
  Pornhub,
  PornhubError,
  SEARCH_ORDERS,
  SEARCH_PERIODS,
  isSearchOrder,
  isSearchPeriod,
  type PornhubSearchResult,
  type SearchOrder,
  type SearchPeriod,
} from "@lib/pornhub";

const MAX_TITLE_LENGTH = 60;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export default defineCommand({
  name: "pornhub",
  aliases: ["ph"],
  category: "nsfw",
  description: "18+ only.",
  flags: [
    FlagSpec.value(["--search", "-s"]).description(
      "Search keyword, e.g. --search cooking",
    ),
    FlagSpec.value(["--page", "-p"]).description(
      "Result page number, starting at 1 (default: 1)",
    ),
    FlagSpec.value("--ordering").description(
      `Sort order: ${SEARCH_ORDERS.join(" | ")} (default: newest)`,
    ),
    FlagSpec.value("--period").description(
      `Time window: ${SEARCH_PERIODS.join(" | ")} (default: alltime)`,
    ),
  ],
  execute: async (ctx) => {
    const query = ctx.args?.value("--search")?.trim();
    if (!query) {
      await ctx.send.text(
        "Usage: ph --search <keyword> [--page 1] [--ordering newest] [--period alltime]",
      );
      return;
    }

    const page = Number.parseInt(ctx.args?.value("--page") ?? "1", 10);
    if (!Number.isInteger(page) || page < 1) {
      await ctx.send.text("`--page` must be a whole number, 1 or higher.");
      return;
    }

    const ordering = ctx.args?.value("--ordering") ?? "newest";
    if (!isSearchOrder(ordering)) {
      await ctx.send.text(
        `Invalid \`--ordering\`. Use one of: ${SEARCH_ORDERS.join(", ")}.`,
      );
      return;
    }

    const period = ctx.args?.value("--period") ?? "alltime";
    if (!isSearchPeriod(period)) {
      await ctx.send.text(
        `Invalid \`--period\`. Use one of: ${SEARCH_PERIODS.join(", ")}.`,
      );
      return;
    }

    try {
      const results = await new Pornhub().search(
        query,
        page,
        ordering as SearchOrder,
        period as SearchPeriod,
      );

      if (results.length === 0) {
        await ctx.send.text(`No results for "${query}" on page ${page}.`);
        return;
      }

      const thumbCandidates = (e: PornhubSearchResult) =>
        [...new Set([e.thumb, ...e.thumbs.map((t) => t.src)])]
          .filter(Boolean)
          .slice(0, 4);

      await ctx.send.interactive.carousel({
        body: `Results for "${query}" (page ${page})`,
        cards: results.map((e) => ({
          image: e.default_thumb,
          imageFallbacks: thumbCandidates(e),
          title: truncate(e.title, MAX_TITLE_LENGTH),
          button: {
            type: "quick_reply",
            id: e.url,
            text: "Select",
          },
        })),
      });
      return;
    } catch (err) {
      ctx.log.error("[pornhub]", err);
      const detail = err instanceof PornhubError ? ` (${err.message})` : "";
      await ctx.send.text(`Search failed${detail}. Please try again later.`);
    }
  },
});
