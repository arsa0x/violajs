# 05 — Interactive Send API

`ctx.send.interactive` sends native-flow WhatsApp UI elements. All methods return `Promise<void>`.

> **Client support:** Native-flow buttons render on WhatsApp mobile (Android & iOS).
> WhatsApp Web and Desktop may render them inconsistently — always test on a physical device.

---

## Shared options

All interactive methods share these base fields:

| Field         | Type                     | Required | Description                                   |
| ------------- | ------------------------ | -------- | --------------------------------------------- |
| `body`        | `string`                 | ✅       | Main message text                             |
| `title`       | `string`                 | —        | Header text above the body                    |
| `footer`      | `string`                 | —        | Footer text below the buttons                 |
| `headerMedia` | `InteractiveHeaderMedia` | —        | Image or video in the header                  |
| `quoted`      | `boolean`                | —        | Quote the triggering message (default `true`) |

### `headerMedia`

```ts
interface InteractiveHeaderMedia {
  type: "image" | "video";
  url: string; // primary URL (fetched and uploaded to WhatsApp)
  fallbackUrls?: string[]; // tried in order if the primary fails
}
```

---

## `quickReply` — tappable buttons

Up to **3 buttons**. Each button's `id` is returned as message text when tapped, so you can
route it back through the command dispatcher.

```ts
await ctx.send.interactive.quickReply({
  body: "What do you want to do?",
  footer: "violajs",
  title: "Options",
  buttons: [
    { text: "Download", id: ".dl" },
    { text: "Search", id: ".search" },
    { text: "Cancel", id: ".cancel" },
  ],
});
```

With a header image:

```ts
await ctx.send.interactive.quickReply({
  body: "Pick one:",
  headerMedia: { type: "image", url: "https://example.com/banner.png" },
  buttons: [{ text: "OK", id: ".confirm" }],
});
```

---

## `singleSelect` — scrollable list

A list grouped into sections. Each row's `id` is returned when selected.

```ts
await ctx.send.interactive.singleSelect({
  body: "Choose a category:",
  selectLabel: "Categories", // button label that opens the list
  sections: [
    {
      title: "Tools",
      rows: [
        { id: ".ping", title: "Ping", description: "Check latency" },
        { id: ".menu", title: "Menu", description: "Show all commands" },
        { id: ".qr", title: "QR", description: "Generate a QR code" },
      ],
    },
    {
      title: "Downloader",
      rows: [
        { id: ".aio", title: "AIO", description: "Download from any URL" },
        {
          id: ".github",
          title: "GitHub",
          description: "Download a GitHub repo",
        },
      ],
    },
  ],
});
```

---

## `urlButton` — open a URL

Opens a URL in the WhatsApp in-app browser when tapped.

```ts
await ctx.send.interactive.urlButton({
  body: "Visit our documentation:",
  text: "Open Docs",
  url: "https://github.com/your-org/violajs",
  footer: "violajs",
});
```

---

## `callButton` — start a phone call

Initiates a call to the given phone number.

```ts
await ctx.send.interactive.callButton({
  body: "Need help? Call our support line:",
  text: "Call Support",
  phoneNumber: "+6281234567890",
});
```

Phone number must be in international format with or without the leading `+`.

---

## `copyCode` — copy to clipboard

Copies a string to the recipient's clipboard when tapped. Useful for OTPs, promo codes, etc.

```ts
await ctx.send.interactive.copyCode({
  body: "Your OTP:",
  text: "Copy Code",
  code: "123456",
  footer: "Expires in 5 minutes",
});
```

---

## `requestLocation` — ask for location

Prompts the recipient to share their location.

```ts
await ctx.send.interactive.requestLocation({
  body: "We need your location to show nearby services.",
  text: "Share Location",
});
```

---

## `inAppSignup`

Sends a native in-app signup button. Account/client support varies.

```ts
await ctx.send.interactive.inAppSignup({
  body: "Sign up for updates:",
  title: "Newsletter",
  footer: "violajs",
});
```

---

## `carousel` — swipeable image cards

A horizontally scrollable carousel with **2–10 image cards**. Each card has its own buttons.

```ts
await ctx.send.interactive.carousel({
  body: "Check out our products:",
  footer: "violajs shop",
  cards: [
    {
      image: "https://example.com/product1.jpg",
      title: "Product A",
      body: "Great value at a low price",
      footer: "$19.99",
      buttons: [
        { type: "url", text: "Buy Now", url: "https://example.com/a" },
        { type: "quick_reply", text: "Details", id: ".details_a" },
      ],
    },
    {
      image: "https://example.com/product2.jpg",
      imageFallbacks: ["https://cdn.example.com/product2.jpg"],
      title: "Product B",
      body: "Premium choice for professionals",
      buttons: [
        { type: "url", text: "Buy Now", url: "https://example.com/b" },
        { type: "quick_reply", text: "Details", id: ".details_b" },
        { type: "call", text: "Ask Us", phoneNumber: "+6281234567890" },
      ],
    },
  ],
});
```

### Carousel button types

| Type            | Required fields       | Description                           |
| --------------- | --------------------- | ------------------------------------- |
| `quick_reply`   | `text`, `id`          | Returns `id` as a message when tapped |
| `url`           | `text`, `url`         | Opens the URL in the in-app browser   |
| `call`          | `text`, `phoneNumber` | Initiates a phone call                |
| `copy`          | `text`, `code`        | Copies code to clipboard              |
| `single_select` | `title`, `sections`   | Opens a list picker                   |

```ts
// copy button in a carousel
{ type: "copy", text: "Copy Promo", code: "SAVE20" }

// single_select button in a carousel
{
  type: "single_select",
  title: "Select size",
  sections: [{
    title: "Sizes",
    rows: [
      { id: "size_s",  title: "S" },
      { id: "size_m",  title: "M" },
      { id: "size_l",  title: "L" },
      { id: "size_xl", title: "XL" },
    ],
  }],
}
```

---

## Reading interactive responses

Use `extractInteractiveResponse` to extract the selected `id` from any button or list reply.
It handles all WhatsApp client variants (legacy buttons, native-flow, template replies).

```ts
import { extractInteractiveResponse } from "@lib/interactive";

// Inside a messages.upsert handler or event plugin:
const responseId = extractInteractiveResponse(message); // string | null

if (responseId === ".details_a") {
  // user tapped "Details" on Product A
}
```

You can also route interactive responses back through the command dispatcher by setting
button `id` values to valid command strings (e.g. `".ping"`).
