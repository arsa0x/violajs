# 04 — Send API

`ctx.send` is a `Send` instance. Every method accepts an optional `reply` boolean
(default `true`) that controls whether the outgoing message quotes the original.

`ctx.send.interactive` is covered separately in [06-interactive-send-api.md](./06-interactive-send-api.md).

---

## Media types

All `media` parameters accept a `WAMediaUpload`:

```ts
type WAMediaUpload =
  | Buffer // in-memory bytes
  | { url: string } // public URL (fetched by Baileys)
  | Readable; // Node.js stream
```

---

## Method reference

| Method     | Signature                              | Description                                   |
| ---------- | -------------------------------------- | --------------------------------------------- |
| `text`     | `(body, reply?)`                       | Plain text. Array → joined without separator. |
| `image`    | `(media, caption?, reply?)`            | Image with optional caption.                  |
| `video`    | `(media, caption?, reply?)`            | Video with optional caption.                  |
| `audio`    | `(media, ptt?, reply?)`                | Audio. `ptt=true` sends as voice note.        |
| `sticker`  | `(media, reply?)`                      | Sticker (WebP).                               |
| `document` | `(media, fileName, mimetype?, reply?)` | File attachment.                              |
| `location` | `(lat, lon, name?, address?, reply?)`  | Location pin.                                 |
| `contact`  | `(displayName, vcard, reply?)`         | vCard contact.                                |
| `reaction` | `(emoji, message?)`                    | React with emoji. `""` removes reaction.      |
| `delete`   | `(message?)`                           | Request deletion of a message.                |
| `edit`     | `(text, message?)`                     | Edit a previously sent message.               |

`message?` defaults to the triggering message (`ctx.msg`) when omitted.

---

## `text`

```ts
// Simple reply (quoted)
await ctx.send.text("Hello!");

// Array is joined without a separator
await ctx.send.text(["Line 1\n", "Line 2\n", "Line 3"]);
// → "Line 1\nLine 2\nLine 3"

// Without quoting
await ctx.send.text("No quote.", false);
```

---

## `image`

```ts
// From a public URL
await ctx.send.image({ url: "https://example.com/photo.jpg" });
await ctx.send.image({ url: "https://example.com/photo.jpg" }, "Caption here");

// From a Buffer (e.g. downloaded image)
import { readFile } from "fs/promises";
const buf = await readFile("./banner.png");
await ctx.send.image(buf, "From disk");

// Without quoting the original message
await ctx.send.image(buf, "No quote", false);
```

---

## `video`

```ts
await ctx.send.video({ url: "https://example.com/clip.mp4" });
await ctx.send.video({ url: "https://example.com/clip.mp4" }, "Watch this!");
```

---

## `audio`

```ts
// Regular audio file
await ctx.send.audio({ url: "https://example.com/track.mp3" });

// Push-to-talk voice note
await ctx.send.audio({ url: "https://example.com/voice.mp3" }, true);

// From buffer
const audioBuf = await readFile("./audio.mp4");
await ctx.send.audio(audioBuf, false); // not PTT
```

---

## `sticker`

```ts
const stickerBuf = await readFile("./sticker.webp");
await ctx.send.sticker(stickerBuf);
```

---

## `document`

```ts
import type { MimeType } from "@src/types/mime";

await ctx.send.document(
  { url: "https://example.com/file.pdf" },
  "report.pdf",
  "application/pdf",
);

// From buffer
const docBuf = await readFile("./data.xlsx");
await ctx.send.document(
  docBuf,
  "data.xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
);
```

**Supported MIME types** (`MimeType`):

```
application/pdf   text/plain       image/jpeg     image/png
video/mp4         video/3gpp       audio/aac      audio/amr
audio/mpeg        audio/mp4        audio/ogg      image/webp
```

---

## `location`

```ts
await ctx.send.location(-6.2088, 106.8456);
await ctx.send.location(-6.2088, 106.8456, "Jakarta");
await ctx.send.location(-6.2088, 106.8456, "Jakarta", "DKI Jakarta, Indonesia");
```

---

## `contact`

```ts
const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:John Doe",
  "TEL;type=CELL;waid=628123456789:+62 812-3456-789",
  "END:VCARD",
].join("\n");

await ctx.send.contact("John Doe", vcard);
```

---

## `reaction`

```ts
// React to the triggering message
await ctx.send.reaction("👍");

// React to a different message (e.g. the bot's own reply)
await ctx.send.reaction("✅", sentMessage);

// Remove a reaction (empty string)
await ctx.send.reaction("");
```

A common pattern — loading state via reactions:

```ts
await ctx.send.reaction("⏳");
try {
  const result = await heavyOperation();
  await ctx.send.reaction("✅");
  await ctx.send.text(result);
} catch (error) {
  await ctx.send.reaction("❌");
  await ctx.send.text("Something went wrong.");
}
```

---

## `delete`

```ts
// Delete the triggering message (requires the bot to be an admin for group messages)
await ctx.send.delete();

// Delete a specific message
await ctx.send.delete(targetMessage);
```

> Deletion is subject to WhatsApp's rules. The bot can only delete messages it sent
> in DMs; in groups it needs admin rights to delete others' messages.

---

## `edit`

```ts
// Edit a previously sent message
const sent = await ctx.sock.sendMessage(ctx.chat.jid, { text: "Processing…" });
// … do work …
await ctx.send.edit("Done! Here are the results.", sent);
```

> Editing is subject to WhatsApp's editing restrictions (time window, message type).
