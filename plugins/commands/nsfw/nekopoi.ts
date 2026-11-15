import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { NEKOPOI_CATEGORIES, Nekopoi, NekopoiError } from "@lib/nekopoi";
import { formatPost, formatSeries } from "@lib/nekopoi/format";
import { config } from "@/config";

/**
 * Cards per carousel. WhatsApp carousels are limited (assumed 10); the API
 * returns far more per page (`all` = 200, `search` = up to 200 observed).
 */
const CARDS_PER_PAGE = 10;

/** `-c <key>` → category id (for `nekopoi.all`) + label shown to the user. */
const CATEGORIES = {
  hentai: { id: NEKOPOI_CATEGORIES.hentai, label: "Hentai" },
  "2d": { id: NEKOPOI_CATEGORIES.animation2d, label: "2D Animation" },
  "3d": { id: NEKOPOI_CATEGORIES.hentai3d, label: "3D Hentai" },
  jav: { id: NEKOPOI_CATEGORIES.jav, label: "JAV" },
  cosplay: { id: NEKOPOI_CATEGORIES.javCosplay, label: "JAV Cosplay" },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

const DEFAULT_CATEGORY: CategoryKey = "hentai";

export default defineCommand({
  name: "nekopoi",
  aliases: ["neko"],
  category: "nsfw",
  usage: [
    ".nekopoi",
    ".nekopoi -c 3d",
    ".nekopoi -s enjo kouhai",
    ".nekopoi -i 112233",
  ],
  flags: [
    FlagSpec.value(["--search", "-s"]).description(
      "Search hentai by query, e.g. .nekopoi -s enjo kouhai",
    ),
    FlagSpec.value(["--page", "-p"]).description(
      "Page number for latest or search, e.g. .nekopoi -c 2d -p 2",
    ),
    FlagSpec.value(["--category", "-c"]).description(
      `Latest by category (${Object.keys(CATEGORIES).join(", ")}), e.g. .nekopoi -c 3d`,
    ),
    FlagSpec.value(["--id", "-i"]).description(
      "Get hentai by id, e.g. .nekopoi -i <id>",
    ),
    // biar gk lupa
    // "post" = per episode
    // "hentai" = kumpulan episode
    FlagSpec.bool("--post").description("Usage: .nekopoi -i <id> --post"),
  ],
  execute: async (ctx): Promise<void> => {
    const nekopoi = new Nekopoi(config);

    const fail = async (err: unknown) => {
      ctx.log.error(err);
      await ctx.send.text(
        err instanceof NekopoiError
          ? `Nekopoi request failed (${err.status})`
          : "Failed to get data from Nekopoi",
      );
    };

    // .nekopoi -i <id> [--post]
    if (ctx.args?.has("--id")) {
      const id = parseInt(ctx.args.value("--id") ?? "", 10);

      if (Number.isNaN(id)) {
        ctx.log.error("Nekopoi id is invalid");
        return;
      }

      try {
        if (ctx.args.has("--post")) {
          // Posts → text: title, date, metadata, stream + download links
          const result = await nekopoi.post(id);
          ctx.log.debug(result);
          await ctx.send.text(formatPost(result));
        } else {
          // Series → text: info + episode list (episode ids for --post)
          const result = await nekopoi.series(id);
          ctx.log.debug(result);
          await ctx.send.text(formatSeries(result));
        }
      } catch (err) {
        await fail(err);
      }
      return;
    }

    // .nekopoi -s <query> [-p n]
    if (ctx.args?.has("--search")) {
      const searchQuery = ctx.args.value("--search");
      // The API's pages start at 1
      const page = parseInt(ctx.args.value("--page") ?? "1", 10) || 1;

      if (!searchQuery) {
        ctx.log.error("Nekopoi search query is empty");
        return;
      }
      const nekopoiSearch = await nekopoi.search(searchQuery, page);

      if (!nekopoiSearch.result?.length) {
        await ctx.send.interactive.inAppSignup({
          body: `Nekopoi Search Result\nSearch query: ${searchQuery}`,
          footer: "Nekopoi",
          title: "Failed to found hentai",
        });
        return;
      }

      ctx.log.debug(nekopoiSearch);

      await ctx.send.interactive.carousel({
        body: `Nekopoi Search Result\nSearch query: ${searchQuery}`,
        cards: nekopoiSearch.result.slice(0, CARDS_PER_PAGE).map((res) => ({
          image: typeof res.image === "string" ? res.image : "",
          title: res.title,
          button: {
            type: "quick_reply",
            id: `.nekopoi --id ${res.id}${res.type === "post" ? " --post" : ""}`,
            text: "Get",
          },
        })),
      });
      return;
    }

    // .nekopoi [-c <category>] [-p n]   (no --id / --search → latest content)
    const key = (
      ctx.args?.value("--category") ?? DEFAULT_CATEGORY
    ).toLowerCase() as CategoryKey;
    const category = CATEGORIES[key];

    if (!category) {
      await ctx.send.text(
        `Unknown category "${key}".\nAvailable: ${Object.keys(CATEGORIES).join(", ")}`,
      );
      return;
    }

    const page = parseInt(ctx.args?.value("--page") ?? "1", 10) || 1;

    try {
      // Newest first, 200 items per API page; we only page through the first
      // API page in chunks of CARDS_PER_PAGE (max 20 pages).
      const latest = await nekopoi.all(category.id, 1);
      const items = latest.result ?? [];
      const start = (page - 1) * CARDS_PER_PAGE;
      const cards = items.slice(start, start + CARDS_PER_PAGE);

      ctx.log.debug({
        category: category.label,
        page,
        total: latest.total,
        cards,
      });

      if (!cards.length) {
        await ctx.send.text(
          `No more ${category.label} content on page ${page}`,
        );
        return;
      }

      await ctx.send.interactive.carousel({
        body: `Nekopoi Latest ${category.label}\nPage ${page}/${Math.ceil(items.length / CARDS_PER_PAGE)}`,
        cards: cards.map((item) => ({
          image: typeof item.image === "string" ? item.image : "",
          title: item.title,
          button: {
            type: "quick_reply",
            // `all` items are always single episodes → --post
            id: `.nekopoi --id ${item.id} --post`,
            text: "Get",
          },
        })),
      });
    } catch (err) {
      await fail(err);
    }
  },
});
