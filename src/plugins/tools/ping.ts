import type { Plugin } from "../../types";

export default {
  name: "ping",
  category: "tools",
  aliases: ["p"],
  execute: async (ctx) => {
    await ctx.sock.sendMessage(ctx.jid, {
      text: "pong",
    });
  },
} satisfies Plugin;
