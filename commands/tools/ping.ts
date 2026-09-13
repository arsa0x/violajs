import { defineCommand } from "@core/command";
import { cooldown } from "@middlewares/cooldown";
import { groupOnly } from "@middlewares/group";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  middleware: [groupOnly(), cooldown(100000)],
  async execute(ctx) {
    await ctx.reply("Pong!");
  },
});
