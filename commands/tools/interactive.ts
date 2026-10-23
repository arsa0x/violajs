import { defineCommand } from "@core/command";

export default defineCommand({
  name: "interactive",
  aliases: ["buttons"],
  category: "tools",
  async execute(ctx) {
    if (ctx.args[0]?.toLowerCase() === "list") {
      await ctx.send.interactive.singleSelect({
        title: "Interactive demo",
        body: "Choose a command from the list.",
        footer: "violajs · native-flow",
        selectLabel: "Choose command",
        sections: [
          {
            title: "Examples",
            rows: [
              {
                title: "Ping",
                description: "Run the ping command",
                id: ".ping",
              },
              {
                title: "Show buttons",
                description: "Return to the quick-reply demo",
                id: ".interactive",
              },
            ],
          },
        ],
      });
      return;
    }

    await ctx.send.interactive.quickReply({
      title: "Interactive demo",
      body: "Tap a button to try a native-flow response.",
      footer: "violajs · native-flow",
      buttons: [
        { text: "Ping", id: ".ping" },
        { text: "Open list", id: ".interactive list" },
      ],
    });
  },
});
