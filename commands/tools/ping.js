import { defineCommand } from "@core/command";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  async execute(ctx) {
    await ctx.reply.text("Pong!");
  },
});
