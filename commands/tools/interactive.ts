import { defineCommand } from "@core/command";

export default defineCommand({
  name: "interactive",
  aliases: ["buttons"],
  category: "tools",
  async execute(ctx) {
    const mode = ctx.args[0]?.toLowerCase();

    if (mode === "list") {
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

    if (mode === "url") {
      await ctx.send.interactive.urlButton({
        title: "violajs",
        body: "Open the violajs GitHub repository.",
        text: "Open GitHub",
        url: "https://github.com/arsa0x/violajs",
      });
      return;
    }

    if (mode === "carousel") {
      await ctx.send.interactive.carousel({
        body: "Browse the violajs demo cards.",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-card-one/640/480",
            title: "Quick reply card",
            body: "Tap to run ping.",
            button: { type: "quick_reply", text: "Ping", id: ".ping" },
          },
          {
            image: "https://picsum.photos/seed/violajs-card-two/640/480",
            title: "URL card",
            body: "Open the project repository.",
            button: { type: "quick_reply", text: "Open project", id: ".interactive url" },
          },
        ],
      });
      return;
    }

    if (mode === "location") {
      await ctx.send.interactive.requestLocation({
        title: "Location request",
        body: "Share your current location if you want to.",
        text: "Share location",
      });
      return;
    }

    if (mode === "copy") {
      await ctx.send.interactive.copyCode({
        title: "Copy-code demo",
        body: "Tap the button to copy this example code.",
        text: "Copy code",
        code: "VIOLA-DEMO",
      });
      return;
    }

    await ctx.send.interactive.quickReply({
      title: "Interactive demo",
      body: "Choose a native-flow message to try.",
      footer: "violajs · native-flow",
      buttons: [
        { text: "Ping", id: ".ping" },
        { text: "Open list", id: ".interactive list" },
        { text: "Carousel", id: ".interactive carousel" },
      ],
    });
  },
});
