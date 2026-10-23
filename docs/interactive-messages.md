# Interactive messages

All methods are available through ctx.send.interactive and use the current chat as the recipient.

> Native-flow support varies by WhatsApp client and version. In particular, WhatsApp Web/Desktop may show “This message couldn't load” for some native-flow message types even when the same message works on mobile. Test on the client your users actually use.

## Quick replies

    await ctx.send.interactive.quickReply({
      title: "Choose an action",
      body: "What would you like to do?",
      buttons: [
        { text: "Ping", id: ".ping" },
        { text: "Help", id: ".help" },
      ],
    });

Button IDs are normalized as interactive responses and can reuse the normal command dispatcher.

## Single select

    await ctx.send.interactive.singleSelect({
      title: "Settings",
      body: "Choose a section.",
      selectLabel: "Open settings",
      sections: [{
        title: "General",
        rows: [
          { title: "Profile", description: "View your profile", id: ".profile" },
          { title: "Help", description: "Show help", id: ".help" },
        ],
      }],
    });

## URL button

    await ctx.send.interactive.urlButton({
      title: "Project",
      body: "Open the project website.",
      text: "Open website",
      url: "https://github.com/arsa0x/violajs",
    });

Only absolute http:// and https:// URLs are accepted.

## Call button

    await ctx.send.interactive.callButton({
      body: "Need help? Contact support.",
      text: "Call support",
      phoneNumber: "+6281234567890",
    });

Use an international-style phone number. The recipient's client decides how the call action is handled.

## Copy-code button

    await ctx.send.interactive.copyCode({
      body: "Use this code at checkout.",
      text: "Copy code",
      code: "VIOLA10",
    });

## Quoting behavior

All methods quote the incoming message by default. Set quoted: false to send without quoting it.

## Compatibility note

These methods construct WhatsApp native-flow messages through Baileys' relay API. Successful relay does not guarantee that every WhatsApp client can render the message. Keep a plain-text fallback for workflows where desktop support is required, and validate each new button type on mobile and Web/Desktop.


## Carousel

A native carousel contains 2–10 image cards. Every card must use the same button type; this API currently supports one quick-reply button or one URL button per card. Image URLs must be publicly reachable so Baileys can download and upload each image to WhatsApp.

### Quick-reply cards

    await ctx.send.interactive.carousel({
      body: "Browse these projects.",
      cards: [
        {
          image: "https://example.com/project-one.jpg",
          title: "Project One",
          body: "A short project description.",
          button: { type: "quick_reply", text: "Details", id: ".project one" },
        },
        {
          image: "https://example.com/project-two.jpg",
          title: "Project Two",
          body: "Another short description.",
          button: { type: "quick_reply", text: "Details", id: ".project two" },
        },
      ],
    });

### URL cards

Use the same button type for every card:

    await ctx.send.interactive.carousel({
      body: "Explore these links.",
      cards: [
        {
          image: "https://example.com/one.jpg",
          title: "First link",
          button: { type: "url", text: "Open", url: "https://example.com/one" },
        },
        {
          image: "https://example.com/two.jpg",
          title: "Second link",
          button: { type: "url", text: "Open", url: "https://example.com/two" },
        },
      ],
    });

The carousel is built with Baileys' native `carouselMessage` structure. Native carousel rendering is client/version-dependent, so verify delivery and card actions on both WhatsApp mobile and Web/Desktop. The `.interactive carousel` command provides a test example.
