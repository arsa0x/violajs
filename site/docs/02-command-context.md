# 02 — CommandContext API

Every `execute` function receives a single `ctx: CommandContext`.
This file documents every property and helper available on it.

---

## Identity & routing

| Property      | Type                | Description                                                         |
| ------------- | ------------------- | ------------------------------------------------------------------- |
| `ctx.name`    | `string`            | Canonical command name as typed (lowercase)                         |
| `ctx.text`    | `string`            | Full raw message text, including prefix and args                    |
| `ctx.rawArgs` | `string[]`          | Whitespace-split tokens after the command name, before flag parsing |
| `ctx.args`    | `Args \| undefined` | Parsed flags and positionals — always present inside `execute`      |
| `ctx.msg`     | `WAMessage`         | The raw Baileys message object                                      |
| `ctx.sock`    | `WASocket`          | The active Baileys WebSocket                                        |
| `ctx.log`     | `Log`               | Session-scoped logger                                               |

---

## Sender

```ts
ctx.sender.jid; // string — sender's JID (normalized, e.g. "628xxx@s.whatsapp.net")
ctx.sender.isOwner; // boolean — true if the JID is in config.owners
```

---

## Chat

```ts
ctx.chat.jid; // string — the chat JID (group JID or sender's JID for DMs)
ctx.chat.isGroup; // boolean — true when the message came from a group
```

---

## Send

`ctx.send` is a `Send` instance. See [05-send-api.md](./05-send-api.md) for all methods.

```ts
await ctx.send.text("Hello!");
await ctx.send.image({ url: "https://example.com/photo.jpg" }, "Caption");
await ctx.send.reaction("👍");
await ctx.send.interactive.quickReply({ … });
```

---

## Logging

`ctx.log` is a `Log` interface scoped to the current session name.

```ts
ctx.log.info("Starting download");
ctx.log.warn("Rate limit hit, retrying…");
ctx.log.error("Fetch failed:", error);
ctx.log.debug("Raw payload:", payload);
```

All logs are prefixed with `[SessionName]` automatically.

---

## Accessing raw args before parsing

`ctx.rawArgs` contains the tokens that were split from the message text before flag
parsing. It is always available, even without any `flags` declared.

```ts
// Message: ".tag hello world"
ctx.rawArgs; // ["hello", "world"]
```

---

## Accessing parsed flags and positionals

`ctx.args` is populated by the dispatcher after flag parsing. It is always defined inside
`execute`. See [03-flags-and-args.md](./03-flags-and-args.md) for the full API.

```ts
const query = ctx.args!.rest().join(" "); // positional tokens
const limit = ctx.args!.value("--limit"); // string | undefined
const verbose = ctx.args!.flag("--verbose"); // boolean
```

---

## Accessing the quoted message

The message the user replied to is in Baileys' `contextInfo`:

```ts
const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

if (!quoted) {
  await ctx.send.text("Please reply to a message to use this command.");
  return;
}
```

For media in the quoted message you need `downloadMediaMessage` from Baileys:

```ts
import { downloadMediaMessage } from "baileys";

const stream = await downloadMediaMessage(
  {
    key: ctx.msg.key,
    message: { imageMessage: quoted.imageMessage! },
  },
  "stream",
  {},
);
```

---

## Accessing mentioned JIDs

```ts
import { getGroupMentions, getGroupTarget } from "@utils/group";

// All mentioned JIDs in the message
const mentions = getGroupMentions(ctx); // string[]

// First target: mention → quoted sender → phone number from args
const target = getGroupTarget(ctx); // string | undefined
```

---

## Checking group membership

```ts
import { isGroupParticipant } from "@utils/group";

const isMember = await isGroupParticipant(ctx, targetJid); // boolean
```

---

## Accessing group metadata

```ts
const meta = await ctx.sock.groupMetadata(ctx.chat.jid);
// meta.subject    — group name
// meta.participants — array of { id, admin }
```

> **Performance note:** `groupMetadata` is a live network call. For commands that call it
> frequently, use the cached version from `@utils/identity` (see
> [04-middleware.md](./04-middleware.md)).

---

## Sending without quoting

All `ctx.send.*` methods default to `reply: true` (they quote the original message).
Pass `false` to send without quoting:

```ts
await ctx.send.text("No quote here.", false);
await ctx.send.image(buf, "Caption", false);
```

---

## Full property reference

```ts
interface CommandContext {
  // Core
  sock: WASocket;
  log: Log;
  msg: WAMessage;

  // Routing
  name: string;
  text: string;
  rawArgs: string[];
  args?: Args;

  // Identity
  sender: { jid: string; isOwner: boolean };
  chat: { jid: string; isGroup: boolean };

  // Messaging
  send: Send;
}
```
