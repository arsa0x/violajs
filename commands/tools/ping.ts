import { defineCommand } from "../../src/core/command";
import { cooldown } from "../../src/middlewares/cooldown";
import { groupOnly } from "../../src/middlewares/group";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  middleware: [groupOnly(), cooldown(100000)],
  async execute(ctx) {
    await ctx.reply("Pong!");
  },
});
