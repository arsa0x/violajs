import { defineCommand } from "@core/command";
import { Args, FlagSpec } from "@lib/args";
import { Nekopoi } from "@lib/nekopoi";
import { config } from "config";

export default defineCommand({
  name: "nekopoi",
  aliases: ["neko", "knp"],
  execute: async (ctx): Promise<void> => {
    const args = Args.parse(ctx.args, [
      FlagSpec.value(["--search", "-s"]).description(
        "Search hentai by query, e.g. .nekopoi -s enjo kouhai",
      ),
      FlagSpec.value(["--page", "-p"]).description(
        "Usage: .nekopoi -g milf -p 2",
      ),
      FlagSpec.value(["--id", "-d"]).description(
        "Get hentai by id, e.g. .nekopoi -i <id>",
      ),
      // biar gk lupa
      // "post" = per episode
      // "hentai" = kumpulan episode
      FlagSpec.value("--post").description("Usage: .nekopoi -i <id> --post"),
    ]);

    const nekopoi = new Nekopoi(config);

    if (args.has("--id")) {
      ctx.log.info("TO DO");
    }
    if (args.has("--search")) {
      const searchQuery = args.value("--search");
      const page = parseInt(args.value("--page") ?? "0", 10);

      if (!searchQuery) {
        ctx.log.error("Nekopoi search query is empty");
        return;
      }
      const nekopoiSearch = await nekopoi.search(searchQuery, page);

      await ctx.send.interactive.carousel({
        body: "Nekopoi Search Result",
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
