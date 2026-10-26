import { defineCommand } from "@core/command";
import { Args, FlagSpec } from "@lib/args";
import { Nekopoi } from "@lib/nekopoi";
import { config } from "config";

export default defineCommand({
  name: "nekopoi",
  aliases: ["neko"],
  flags: [
    FlagSpec.value(["--search", "-s"]).description(
      "Search hentai by query, e.g. .nekopoi -s enjo kouhai",
    ),
    FlagSpec.value(["--page", "-p"]).description(
      "Usage: .nekopoi -g milf -p 2",
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

    if (ctx.args?.has("--id")) {
      ctx.log.info("TO DO");
    }
    if (ctx.args?.has("--search")) {
      const searchQuery = ctx.args.value("--search");
      const page = parseInt(ctx.args.value("--page") ?? "0", 10);

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

      await ctx.send.interactive.carousel({
        body: `Nekopoi Search Result\nSearch query: ${searchQuery}`,
        cards: nekopoiSearch.result.map((res) => ({
          image: res.image,
          title: res.title,
          button: {
            type: "quick_reply",
            id: `.nekopoi --id ${res.id.toString()} ${res.type === "post" ? "--post" : ""}`,
            text: "Get",
          },
        })),
      });
    }
  },
});
