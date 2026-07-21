import type { Plugin } from "../../types";

export default {
  name: "ping",
  category: "tools",
  aliases: ["p"],
  execute: async ({ msg, jid, sock }) => {
    await sock.sendMessage(
      jid,
      {
        text: "pong",
      },
      { quoted: msg },
    );
  },
} satisfies Plugin;
