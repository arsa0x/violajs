import { defineCommand } from "@core/command";

export default defineCommand({
  name: "interactive",
  aliases: ["buttons"],
  category: "tools",
  async execute(ctx) {
    const mode = ctx.rawArgs[0]?.toLowerCase();

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
        footer: "violajs · carousel footer",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-card-one/640/480",
            title: "Quick reply card",
            body: "Tap a button to run ping or open the project.",
            footer: "Card footer example",
            buttons: [
              { type: "quick_reply", text: "Ping", id: ".ping" },
              {
                type: "url",
                text: "Open project",
                url: "https://github.com/arsa0x/violajs",
              },
            ],
          },
          {
            image: "https://picsum.photos/seed/violajs-card-two/640/480",
            title: "Quick reply card 2",
            body: "Open the URL-button demo.",
            footer: "A card can have its own footer.",
            buttons: [
              {
                type: "quick_reply",
                text: "Open demo",
                id: ".interactive url",
              },
            ],
          },
        ],
      });
      return;
    }

    if (mode === "carousel-url") {
      await ctx.send.interactive.carousel({
        body: "Carousel URL-button demo.",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-url-one/640/480",
            title: "Project repository",
            body: "Open GitHub.",
            button: {
              type: "url",
              text: "Open GitHub",
              url: "https://github.com/arsa0x/violajs",
              merchantUrl: "https://github.com/arsa0x/violajs",
              webviewInteraction: true,
            },
          },
          {
            image: "https://picsum.photos/seed/violajs-url-two/640/480",
            title: "GitHub profile",
            body: "Open the maintainer profile.",
            button: {
              type: "url",
              text: "Open profile",
              url: "https://github.com/arsa0x",
            },
          },
        ],
      });
      return;
    }

    if (mode === "carousel-call") {
      await ctx.send.interactive.carousel({
        body: "Carousel call-button demo.",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-call-one/640/480",
            title: "Support",
            button: {
              type: "call",
              text: "Call support",
              phoneNumber: "+6281234567890",
            },
          },
          {
            image: "https://picsum.photos/seed/violajs-call-two/640/480",
            title: "Contact",
            button: {
              type: "call",
              text: "Call contact",
              phoneNumber: "+6281234567890",
            },
          },
        ],
      });
      return;
    }

    if (mode === "carousel-copy") {
      await ctx.send.interactive.carousel({
        body: "Carousel copy-code demo.",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-copy-one/640/480",
            title: "Promo one",
            button: {
              type: "copy",
              text: "Copy code",
              code: "VIOLA10",
              id: "promo-one",
            },
          },
          {
            image: "https://picsum.photos/seed/violajs-copy-two/640/480",
            title: "Promo two",
            button: { type: "copy", text: "Copy code", code: "VIOLA20" },
          },
        ],
      });
      return;
    }

    if (mode === "carousel-list") {
      await ctx.send.interactive.carousel({
        body: "Carousel single-select demo.",
        cards: [
          {
            image: "https://picsum.photos/seed/violajs-list-one/640/480",
            title: "General commands",
            button: {
              type: "single_select",
              title: "Choose command",
              sections: [
                {
                  title: "General",
                  rows: [
                    {
                      title: "Ping",
                      id: ".ping",
                      description: "Check bot status",
                    },
                    {
                      title: "Help",
                      id: ".help",
                      description: "Show available commands",
                    },
                  ],
                },
              ],
            },
          },
          {
            image: "https://picsum.photos/seed/violajs-list-two/640/480",
            title: "Interactive commands",
            button: {
              type: "single_select",
              title: "Choose command",
              sections: [
                {
                  title: "Interactive",
                  rows: [
                    { title: "Quick replies", id: ".interactive" },
                    { title: "URL button", id: ".interactive url" },
                  ],
                },
              ],
            },
          },
        ],
      });
      return;
    }

    if (mode === "signup") {
      await ctx.send.interactive.inAppSignup({
        title: "In-app signup demo",
        body: "Try the native in-app signup action.",
        footer: "violajs · native-flow",
      });
      return;
    }

    if (mode === "media") {
      await ctx.send.interactive.quickReply({
        title: "Interactive media header",
        body: "This message uses an image header.",
        headerMedia: {
          type: "image",
          url: "https://picsum.photos/seed/violajs-interactive-header/800/500",
        },
        buttons: [{ text: "Ping", id: ".ping" }],
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
