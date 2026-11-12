# Plugin Development

> **Runtime:** Bun ≥ 1.4.0 · **Core library:** Baileys · **Last updated:** 2026-11-12

---

## Table of Contents

1. [Overview](#1-overview)
2. [Command Plugins](#2-command-plugins)
   - [Anatomy](#21-anatomy)
   - [Field Reference](#22-field-reference)
   - [Minimal Example](#23-minimal-example)
3. [Flags & the Args API](#3-flags--the-args-api)
   - [FlagSpec Kinds](#31-flagspec-kinds)
   - [Args Methods](#32-args-methods)
   - [Annotated Example](#33-annotated-example)
4. [Middleware](#4-middleware)
   - [Built-in Middleware](#41-built-in-middleware)
   - [Chaining Order](#42-chaining-order)
   - [Writing a Custom Middleware](#43-writing-a-custom-middleware)
5. [CommandContext Reference](#5-commandcontext-reference)
6. [Command Plugin — Full Example](#6-command-plugin--full-example)
7. [Event Plugins](#7-event-plugins)
   - [Anatomy](#71-anatomy)
   - [Available Events](#72-available-events)
   - [Minimal Example](#73-minimal-example)
8. [EventContext Reference](#8-eventcontext-reference)
9. [Event Plugin — Full Example](#9-event-plugin--full-example)
10. [Send API Reference](#10-send-api-reference)
    - [Text & Media](#101-text--media)
    - [Interactive Messages](#102-interactive-messages)
11. [Registering & Generating Plugins](#11-registering--generating-plugins)
12. [Hot-Reload (Development)](#12-hot-reload-development)
13. [Recipes & Common Patterns](#13-recipes--common-patterns)
14. [Troubleshooting FAQ](#14-troubleshooting-faq)

---

## 1. Overview

violajs uses two independent plugin systems that sit alongside each other:

| System             | Purpose                                              | Directory   | Base type     |
| ------------------ | ---------------------------------------------------- | ----------- | ------------- |
| **Command plugin** | Responds to a prefixed command string (e.g. `.ping`) | `commands/` | `Command`     |
| **Event plugin**   | Reacts to WhatsApp events (messages, joins, etc.)    | `events/`   | `EventPlugin` |

Both plugin types are **plain TypeScript modules** with a default export. They are discovered automatically and registered via a code-generation step (or the hot-reload watcher in development).

### Project layout

```
violajs/
├── commands/           ← command plugins, any depth
│   ├── tools/
│   │   └── ping.ts
│   └── nsfw/
│       └── pornhub.ts
├── events/             ← event plugins, any depth
│   └── group.ts
├── src/
│   ├── core/           ← framework internals (do not edit)
│   ├── middlewares/    ← reusable middleware factories
│   ├── types/          ← shared TypeScript types
│   └── generated/      ← auto-generated registry (do not edit)
├── lib/                ← shared utilities (Send, Args, loggers…)
└── config.ts           ← bot configuration
```

---

## 2. Command Plugins

### 2.1 Anatomy

A command plugin is a file that **default-exports** a `Command` object (created with `defineCommand`).

```ts
// commands/<category>/<name>.ts
import { defineCommand } from "@core/command";

export default defineCommand({
  name: "...",
  // ... fields
  execute: async (ctx) => {
    // handler body
  },
});
```

### 2.2 Field Reference

| Field         | Type                                     | Required | Description                                                                                                 |
| ------------- | ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `name`        | `string`                                 | ✅       | Primary command name, **lowercase**, no spaces. Must be unique across all commands and aliases.             |
| `aliases`     | `string[]`                               | —        | Alternative names that trigger this command.                                                                |
| `category`    | `Category`                               | —        | Groups the command in the menu. See categories below.                                                       |
| `description` | `string`                                 | —        | One-line description shown in the menu and `--help` output.                                                 |
| `usage`       | `string[]`                               | —        | Usage examples shown in `--help`, e.g. `[".ping", ".ping --verbose"]`.                                      |
| `flags`       | `FlagSpec[]`                             | —        | Declared flags parsed from the command arguments. See §3.                                                   |
| `middleware`  | `Middleware[]`                           | —        | Per-command middleware chain, run after global middleware. See §4.                                          |
| `execute`     | `(ctx: CommandContext) => Promise<void>` | ✅       | Async command handler.                                                                                      |
| `dispose`     | `() => void \| Promise<void>`            | —        | Called by the hot-reload system when this command is unregistered. Use it to clear timers or close handles. |

**Available categories** (`Category` type):

| Value             | Display name            |
| ----------------- | ----------------------- |
| `"tools"`         | Tools                   |
| `"downloader"`    | Downloader              |
| `"search"`        | Search                  |
| `"admin"`         | Group administration    |
| `"nsfw"`          | NSFW                    |
| `"ai"`            | AI                      |
| `"game"`          | Game                    |
| `"maker"`         | Maker                   |
| `"uncategorized"` | Uncategorized (default) |

### 2.3 Minimal Example

```ts
// commands/tools/ping.ts
import { defineCommand } from "@core/command";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  category: "tools",
  description: "Check if the bot is alive.",
  usage: [".ping"],

  execute: async (ctx) => {
    const start = Date.now();
    await ctx.send.text("Pong! 🏓");
    // ctx.send.text() resolves after the message is enqueued
    const ms = Date.now() - start;
    await ctx.send.text(`Latency: ${ms}ms`, false); // false = don't quote
  },
});
```

---

## 3. Flags & the Args API

Flags are declared with `FlagSpec` and parsed automatically by the dispatcher before `execute` is called. The parsed result is available as `ctx.args`.

### 3.1 FlagSpec Kinds

| Kind    | Factory                 | Parsed as                                              | Example input                               |
| ------- | ----------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `bool`  | `FlagSpec.bool(names)`  | `boolean` — true when present                          | `--verbose`                                 |
| `value` | `FlagSpec.value(names)` | `string \| undefined` — text after the flag            | `--query hello world`                       |
| `list`  | `FlagSpec.list(names)`  | `string[]` — comma-separated or space-separated values | `--tags foo,bar` or `--tags foo --tags bar` |
| `json`  | `FlagSpec.json(names)`  | `unknown` — first valid JSON token sequence            | `--data {"key":"val"}`                      |

**Rules:**

- `names` can be a single string or an array: `FlagSpec.bool("--verbose")` or `FlagSpec.bool(["--verbose", "-v"])`.
- The first name is the **canonical name** used by all `ctx.args` lookup calls.
- Names `--help` and `-h` are reserved by the dispatcher and cannot be used by plugins.
- Calling `.description("…")` on any `FlagSpec` adds the text to `--help` output.

### 3.2 Args Methods

| Method                                 | Returns                       | Description                                                            |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `ctx.args.flag(name)`                  | `boolean`                     | `true` if a `bool` flag was present.                                   |
| `ctx.args.has(name)`                   | `boolean`                     | `true` if the flag appeared at all (even without a value).             |
| `ctx.args.value(name)`                 | `string \| undefined`         | Raw string value of a `value` flag.                                    |
| `ctx.args.valueParsed(name, parser)`   | `T \| undefined`              | Applies `parser` to the raw value; returns `undefined` on parse error. |
| `ctx.args.list(name)`                  | `string[]`                    | Copy of the parsed list (empty array if absent).                       |
| `ctx.args.listNonEmpty(name)`          | `string[] \| undefined`       | Same but `undefined` when empty.                                       |
| `ctx.args.json<T>(name)`               | `T \| undefined`              | Parsed JSON value, or `undefined` if missing or invalid.               |
| `ctx.args.jsonParsed<T>(name, parser)` | `T \| undefined`              | Applies `parser` to the JSON value.                                    |
| `ctx.args.jsonError(name)`             | `JsonParseError \| undefined` | Details of a JSON parse failure, if any.                               |
| `ctx.args.positional(index)`           | `string \| undefined`         | Positional argument at the given 0-based index.                        |
| `ctx.args.rest()`                      | `string[]`                    | All positional arguments.                                              |
| `ctx.args.restFrom(index)`             | `string[]`                    | Positional arguments starting from `index`.                            |

> **Alias resolution:** pass any declared name for a flag and the canonical name is resolved automatically. `.flag("-v")` and `.flag("--verbose")` refer to the same flag.

### 3.3 Annotated Example

```ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";

export default defineCommand({
  name: "search",
  category: "search",
  description: "Search the web.",
  usage: [".search <query>", ".search <query> --page 2 --safe"],
  flags: [
    FlagSpec.value(["--page", "-p"]).description("Page number (default: 1)."),
    FlagSpec.bool(["--safe", "-s"]).description("Enable safe search."),
    FlagSpec.list(["--tags", "-t"]).description(
      "Filter by tags (comma-separated).",
    ),
  ],

  execute: async (ctx) => {
    // Positional arguments are words that don't follow a declared flag.
    // Input: .search hello world --page 2 --safe
    // ctx.args.rest()       → ["hello", "world"]
    // ctx.args.value("--page") → "2"
    // ctx.args.flag("--safe")  → true

    const query = ctx.args.rest().join(" ");
    if (!query) {
      await ctx.send.text("Usage: .search <query>");
      return;
    }

    const page = ctx.args.valueParsed("--page", Number) ?? 1;
    const safe = ctx.args.flag("--safe");
    const tags = ctx.args.list("--tags"); // [] if not provided

    await ctx.send.text(
      `Searching: "${query}", page ${page}, safe=${safe}, tags=${tags.join(", ") || "none"}`,
    );
  },
});
```

---

## 4. Middleware

Middleware functions wrap the command handler and run in a chain. Each middleware receives the `CommandContext` and a `next` function. It **must** call `next()` to continue the chain, or return early to abort.

```ts
// Middleware signature
type Middleware = (
  ctx: CommandContext,
  next: () => Promise<void>,
) => Promise<void>;
```

### 4.1 Built-in Middleware

All are factory functions imported from `@src/middlewares/`.

#### `cooldown(durationMs: number)`

Prevents the same user from running the same command more than once per window.

```ts
import { cooldown } from "@src/middlewares/cooldown";

middleware: [cooldown(5_000)]; // 5-second cooldown per user
```

#### `groupOnly()`

Rejects the command if it is used in a private (DM) chat.

```ts
import { groupOnly } from "@src/middlewares/group";

middleware: [groupOnly()];
```

#### `groupAdminOnly()`

Rejects the command if the sender is not a group admin or superadmin.

```ts
import { groupAdminOnly } from "@src/middlewares/group-admin";

middleware: [groupAdminOnly()];
```

> Requires the command to be used in a group. Does **not** implicitly call `groupOnly()` — chain them together if needed.

#### `botAdminOnly()`

Rejects the command if the bot itself is not a group admin.

```ts
import { botAdminOnly } from "@src/middlewares/bot-admin";

middleware: [botAdminOnly()];
```

#### `ownerOnly()`

Restricts the command to the bot owners defined in `config.ts`.

```ts
import { ownerOnly } from "@src/middlewares/owner";

middleware: [ownerOnly()];
```

#### `logger(log)`

Logs command invocations and execution time. Typically used as **global middleware** in `src/app.ts`, not per-command.

```ts
import { logger } from "@src/middlewares/logger";
import { createSessionLogger } from "@lib/logger";

// In app.ts:
const dispatcher = new CommandDispatcher(registry, [logger(log)]);
```

### 4.2 Chaining Order

Middleware runs in the following order:

```
Global middleware (defined in CommandDispatcher)
  → Command-level middleware (defined in command.middleware[])
    → command.execute(ctx)
```

```ts
// Example: a group-admin-only command with a cooldown
import { defineCommand } from "@core/command";
import { groupOnly } from "@src/middlewares/group";
import { groupAdminOnly } from "@src/middlewares/group-admin";
import { cooldown } from "@src/middlewares/cooldown";

export default defineCommand({
  name: "close",
  category: "admin",
  middleware: [
    groupOnly(), // 1. must be in a group
    groupAdminOnly(), // 2. sender must be admin
    cooldown(10_000), // 3. 10-second cooldown
  ],
  execute: async (ctx) => {
    await ctx.sock.groupSettingUpdate(ctx.chat.jid, "announcement");
    await ctx.send.text("Group closed. Only admins can send messages.");
  },
});
```

### 4.3 Writing a Custom Middleware

```ts
// src/middlewares/nsfw-gate.ts
import type { Middleware } from "@src/types/middleware";

// A middleware that only allows the command in groups that have NSFW enabled.
// The enabled set would be backed by a persistent store in a real bot.
const nsfwGroups = new Set<string>();

export const nsfwGate = (): Middleware => async (ctx, next) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya tersedia di group.");
    return;
  }

  if (!nsfwGroups.has(ctx.chat.jid)) {
    await ctx.send.text(
      "NSFW belum diaktifkan di group ini. Gunakan .nsfw on.",
    );
    return;
  }

  // Always await next() — omitting it silently drops the command.
  await next();
};

// A paired command to toggle the gate:
// .nsfw on  → nsfwGroups.add(ctx.chat.jid)
// .nsfw off → nsfwGroups.delete(ctx.chat.jid)
```

> **Tip:** Middleware that manipulates shared state (like `nsfwGroups`) should be declared in its own module so the state persists for the lifetime of the process, not recreated on each command invocation.

---

## 5. CommandContext Reference

`ctx` is the single argument passed to `execute` and to every middleware.

| Property             | Type                | Description                                                                                         |
| -------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `ctx.sock`           | `WASocket`          | The active Baileys socket. Use for Baileys API calls (`groupMetadata`, `sendPresenceUpdate`, etc.). |
| `ctx.msg`            | `WAMessage`         | The raw WhatsApp message that triggered this command.                                               |
| `ctx.text`           | `string`            | The full message text, including the prefix and command name.                                       |
| `ctx.name`           | `string`            | The resolved command name (lowercase, without prefix).                                              |
| `ctx.rawArgs`        | `string[]`          | Arguments as a string array, before flag parsing.                                                   |
| `ctx.args`           | `Args \| undefined` | Parsed flags and positionals. Available after the dispatcher runs; always present in `execute`.     |
| `ctx.sender.jid`     | `string`            | JID of the message sender.                                                                          |
| `ctx.sender.isOwner` | `boolean`           | Whether the sender is in the owners list.                                                           |
| `ctx.chat.jid`       | `string`            | JID of the chat (group or DM).                                                                      |
| `ctx.chat.isGroup`   | `boolean`           | Whether the chat is a WhatsApp group.                                                               |
| `ctx.send`           | `Send`              | Message-sending helpers. See §10.                                                                   |
| `ctx.log`            | `Log`               | Session-scoped logger.                                                                              |

---

## 6. Command Plugin — Full Example

A realistic search command that queries an external API, uses flags, middleware, and multiple send methods.

```ts
// commands/search/youtube.ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { cooldown } from "@src/middlewares/cooldown";

const API_BASE = "https://www.googleapis.com/youtube/v3";

export default defineCommand({
  name: "youtube",
  aliases: ["yt"],
  category: "search",
  description: "Search YouTube videos.",
  usage: [
    ".youtube <query>",
    ".youtube <query> --max 5",
    ".youtube <query> --channel",
  ],
  flags: [
    FlagSpec.value(["--max", "-m"]).description(
      "Maximum results (1–10, default: 3).",
    ),
    FlagSpec.bool(["--channel", "-c"]).description(
      "Search channels instead of videos.",
    ),
  ],
  middleware: [cooldown(8_000)],

  execute: async (ctx) => {
    const query = ctx.args!.rest().join(" ").trim();

    if (!query) {
      await ctx.send.text([
        "*YouTube Search*\n",
        "Usage: `.youtube <query>`\n",
        "Example: `.youtube lofi hip hop`",
      ]);
      return;
    }

    const maxRaw = ctx.args!.valueParsed("--max", Number);
    const max = Math.min(10, Math.max(1, maxRaw ?? 3));
    const type = ctx.args!.flag("--channel") ? "channel" : "video";

    // Indicate activity
    await ctx.sock.sendPresenceUpdate("composing", ctx.chat.jid);

    let data: {
      items?: Array<{
        id: unknown;
        snippet: { title: string; channelTitle: string; description: string };
      }>;
    };
    try {
      const res = await fetch(
        `${API_BASE}/search?` +
          new URLSearchParams({
            part: "snippet",
            q: query,
            maxResults: String(max),
            type,
            key: process.env.YOUTUBE_API_KEY ?? "",
          }),
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      ctx.log.error("YouTube API error:", err);
      await ctx.send.text(
        "Gagal mengambil data dari YouTube. Coba lagi nanti.",
      );
      return;
    } finally {
      await ctx.sock.sendPresenceUpdate("paused", ctx.chat.jid);
    }

    const items = data.items ?? [];
    if (items.length === 0) {
      await ctx.send.text(`Tidak ada hasil untuk *${query}*.`);
      return;
    }

    const lines = items.map((item, i) => {
      const { title, channelTitle, description } = item.snippet;
      const id =
        type === "video"
          ? (item.id as { videoId: string }).videoId
          : (item.id as { channelId: string }).channelId;
      const url =
        type === "video"
          ? `https://youtu.be/${id}`
          : `https://youtube.com/channel/${id}`;

      return [
        `*${i + 1}. ${title}*`,
        `Channel: ${channelTitle}`,
        description ? `${description.slice(0, 80)}…` : "",
        url,
      ]
        .filter(Boolean)
        .join("\n");
    });

    await ctx.send.text(`🎬 *YouTube — ${query}*\n\n` + lines.join("\n\n"));
  },
});
```

---

## 7. Event Plugins

### 7.1 Anatomy

An event plugin is a file that **default-exports** an `EventPlugin` object (created with `defineEvent`).

```ts
// events/<name>.ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "my-plugin",
  events: {
    "message.received": async (ctx) => {
      /* … */
    },
    "group.participant.join": async (ctx) => {
      /* … */
    },
  },
});
```

| Field    | Type            | Required | Description                                                                     |
| -------- | --------------- | -------- | ------------------------------------------------------------------------------- |
| `name`   | `string`        | ✅       | Unique plugin identifier. Used in logs and hot-reload tracking.                 |
| `events` | `EventHandlers` | ✅       | Map of event names to async handlers. A plugin can handle any number of events. |

### 7.2 Available Events

#### Internal events (emitted by the framework)

| Event name                  | Payload type                                                 | Fired when                                             |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `"message.received"`        | `{ message, text, chat: { jid, isGroup }, sender: { jid } }` | Any non-outgoing message is received.                  |
| `"group.participant.join"`  | `{ groupJid, participants: string[], author?: string }`      | One or more users join a group.                        |
| `"group.participant.leave"` | `{ groupJid, participants: string[], author?: string }`      | One or more users leave or are removed from a group.   |
| `"connection.open"`         | `{ userJid: string }`                                        | The WhatsApp connection becomes open.                  |
| `"connection.close"`        | `{ reason?: string }`                                        | The connection is closed (before a reconnect attempt). |

#### Raw Baileys events (pass-through)

| Event name                            | Payload type                                   |
| ------------------------------------- | ---------------------------------------------- |
| `"baileys.messages.upsert"`           | `BaileysEventMap["messages.upsert"]`           |
| `"baileys.connection.update"`         | `BaileysEventMap["connection.update"]`         |
| `"baileys.group-participants.update"` | `BaileysEventMap["group-participants.update"]` |

> Prefer the internal events when possible. They are normalized and easier to work with. Use `baileys.*` events only when you need fields that the internal events don't expose.

### 7.3 Minimal Example

```ts
// events/logger.ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "message-logger",
  events: {
    "message.received": async (ctx) => {
      ctx.log.info(
        `[${ctx.event.chat.isGroup ? "group" : "dm"}] ${ctx.event.sender.jid}: ${ctx.event.text}`,
      );
    },
  },
});
```

---

## 8. EventContext Reference

Each event handler receives an `EventContext<TPayload>`:

| Property         | Type       | Description                                                                         |
| ---------------- | ---------- | ----------------------------------------------------------------------------------- |
| `ctx.event`      | `TPayload` | The event payload. Its shape depends on the event name (see §7.2).                  |
| `ctx.pluginName` | `string`   | The name of the plugin that owns this handler. Useful for self-referential logging. |
| `ctx.sock`       | `WASocket` | The active Baileys socket.                                                          |
| `ctx.log`        | `Log`      | Session-scoped logger.                                                              |

> Event handlers do **not** have a `ctx.send` helper because they are not bound to a specific message. Use `ctx.sock.sendMessage(jid, content)` directly, or construct a `Send` instance: `new Send(ctx.sock, msg, jid)` (import from `@lib/send`).

---

## 9. Event Plugin — Full Example

A complete welcome/farewell plugin that fetches group metadata and sends a media message.

```ts
// events/group.ts
import { defineEvent } from "@core/event";
import { Send } from "@lib/send";

export default defineEvent({
  name: "group-lifecycle",
  events: {
    // --- Welcome new members ---
    "group.participant.join": async (ctx) => {
      const { groupJid, participants } = ctx.event;

      let groupName = groupJid;
      try {
        const meta = await ctx.sock.groupMetadata(groupJid);
        groupName = meta.subject;
      } catch {
        ctx.log.warn(`Could not fetch metadata for ${groupJid}`);
      }

      for (const participantJid of participants) {
        // Mention the new member using WhatsApp's @mention format
        const mention = participantJid.replace("@s.whatsapp.net", "");

        try {
          await ctx.sock.sendMessage(groupJid, {
            text: `👋 Selamat datang di *${groupName}*, @${mention}!\n\nSilakan baca peraturan grup.`,
            mentions: [participantJid],
          });
        } catch (err) {
          ctx.log.error(`Failed to send welcome to ${participantJid}:`, err);
        }
      }
    },

    // --- Farewell leaving members ---
    "group.participant.leave": async (ctx) => {
      const { groupJid, participants } = ctx.event;

      for (const participantJid of participants) {
        const mention = participantJid.replace("@s.whatsapp.net", "");
        try {
          await ctx.sock.sendMessage(groupJid, {
            text: `👋 Selamat tinggal, @${mention}. Semoga sukses!`,
            mentions: [participantJid],
          });
        } catch (err) {
          ctx.log.error(`Failed to send farewell to ${participantJid}:`, err);
        }
      }
    },

    // --- Log raw connection events ---
    "connection.open": async (ctx) => {
      ctx.log.info(`Bot connected as ${ctx.event.userJid}`);
    },

    "connection.close": async (ctx) => {
      ctx.log.warn(
        `Connection closed. Reason: ${ctx.event.reason ?? "unknown"}`,
      );
    },
  },
});
```

---

## 10. Send API Reference

The `Send` class is available as `ctx.send` in every command handler. It wraps Baileys' `sendMessage` with a simpler API and always quotes the triggering message by default.

### 10.1 Text & Media

#### `ctx.send.text(body, reply?)`

Send a plain text message.

```ts
await ctx.send.text("Hello!");
await ctx.send.text(["Line 1", " Line 2"]); // arrays are concatenated
await ctx.send.text("No quote", false); // reply = false → don't quote
```

| Parameter | Type                 | Default | Description                                        |
| --------- | -------------------- | ------- | -------------------------------------------------- |
| `body`    | `string \| string[]` | —       | Message text. Arrays are joined without separator. |
| `reply`   | `boolean`            | `true`  | Quote the triggering message.                      |

---

#### `ctx.send.image(media, caption?, reply?)`

```ts
await ctx.send.image({ url: "https://example.com/photo.jpg" }, "Caption here");
await ctx.send.image(Buffer.from(imageBytes), "From buffer");
```

---

#### `ctx.send.video(media, caption?, reply?)`

```ts
await ctx.send.video({ url: "https://example.com/clip.mp4" }, "Watch this");
```

---

#### `ctx.send.audio(media, ptt?, reply?)`

```ts
await ctx.send.audio(audioBuffer); // regular audio
await ctx.send.audio(voiceBuffer, true); // push-to-talk voice note
```

| Parameter | Type            | Default | Description                         |
| --------- | --------------- | ------- | ----------------------------------- |
| `media`   | `WAMediaUpload` | —       | Buffer, URL object, or file stream. |
| `ptt`     | `boolean`       | `false` | Send as a voice message.            |
| `reply`   | `boolean`       | `true`  | Quote the triggering message.       |

---

#### `ctx.send.sticker(media, reply?)`

```ts
await ctx.send.sticker(stickerBuffer);
```

---

#### `ctx.send.document(media, fileName, mimetype?, reply?)`

```ts
await ctx.send.document(pdfBuffer, "report.pdf", "application/pdf");
```

---

#### `ctx.send.location(latitude, longitude, name?, address?, reply?)`

```ts
await ctx.send.location(-6.2088, 106.8456, "Jakarta", "Indonesia");
```

---

#### `ctx.send.contact(displayName, vcard, reply?)`

```ts
const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:John Doe",
  "TEL;type=CELL;waid=6281234567890:+62 812-3456-7890",
  "END:VCARD",
].join("\n");
await ctx.send.contact("John Doe", vcard);
```

---

#### `ctx.send.reaction(emoji, message?)`

React to a message with an emoji. Pass an empty string to remove a reaction.

```ts
await ctx.send.reaction("✅"); // react to ctx.msg
await ctx.send.reaction("❌", otherMsg); // react to a different message
await ctx.send.reaction(""); // remove reaction from ctx.msg
```

---

#### `ctx.send.edit(text, message?)`

#### `ctx.send.delete(message?)`

```ts
const sent = await ctx.sock.sendMessage(ctx.chat.jid, { text: "Processing…" });
// … do work …
await ctx.send.edit("Done!", sent); // edit the sent message in place
await ctx.send.delete(sent); // delete the sent message
```

---

### 10.2 Interactive Messages

Interactive messages are accessed through `ctx.send.interactive`. They use WhatsApp's native-flow protocol and require a Baileys-connected socket.

> ⚠️ Native-flow rendering varies by WhatsApp client version. Test on the target client before shipping.

---

#### `ctx.send.interactive.quickReply(options)`

Send up to 3 tappable buttons. Each button's `id` is returned as a message when tapped, so it can be re-dispatched as a command.

```ts
await ctx.send.interactive.quickReply({
  body: "Pilih salah satu:",
  title: "Menu",
  footer: "violajs",
  buttons: [
    { text: "Ping", id: ".ping" },
    { text: "Help", id: ".menu" },
    { text: "Cancel", id: ".cancel" },
  ],
});
```

| Field         | Type                            | Required | Description                       |
| ------------- | ------------------------------- | -------- | --------------------------------- |
| `body`        | `string`                        | ✅       | Main message text.                |
| `title`       | `string`                        | —        | Bold header text.                 |
| `footer`      | `string`                        | —        | Dimmed footer text.               |
| `headerMedia` | `InteractiveHeaderMedia`        | —        | Image or video header.            |
| `buttons`     | `InteractiveQuickReplyButton[]` | ✅       | 1–3 buttons with `text` and `id`. |
| `quoted`      | `boolean`                       | —        | Default `true`.                   |

---

#### `ctx.send.interactive.singleSelect(options)`

Send a list selector with sections and rows.

```ts
await ctx.send.interactive.singleSelect({
  body: "Pilih menu:",
  selectLabel: "Buka menu",
  sections: [
    {
      title: "Tools",
      rows: [
        { id: ".ping", title: "Ping", description: "Cek koneksi bot" },
        { id: ".menu", title: "Menu", description: "Lihat semua command" },
      ],
    },
    {
      title: "Downloader",
      rows: [
        { id: ".yt", title: "YouTube", description: "Download video YouTube" },
      ],
    },
  ],
});
```

---

#### `ctx.send.interactive.urlButton(options)`

```ts
await ctx.send.interactive.urlButton({
  body: "Kunjungi website kami:",
  text: "Buka Website",
  url: "https://example.com",
});
```

---

#### `ctx.send.interactive.callButton(options)`

```ts
await ctx.send.interactive.callButton({
  body: "Hubungi support:",
  text: "Call Support",
  phoneNumber: "+6281234567890",
});
```

---

#### `ctx.send.interactive.copyCode(options)`

```ts
await ctx.send.interactive.copyCode({
  body: "Kode promo kamu:",
  text: "Salin Kode",
  code: "VIOLA2026",
});
```

---

#### `ctx.send.interactive.requestLocation(options)`

```ts
await ctx.send.interactive.requestLocation({
  body: "Bagikan lokasi kamu:",
  text: "Kirim Lokasi",
});
```

---

#### `ctx.send.interactive.carousel(options)`

A swipeable carousel of image cards with buttons. Requires at least 2 cards.

```ts
await ctx.send.interactive.carousel({
  body: "Produk terbaru:",
  cards: [
    {
      image: "https://example.com/product1.jpg",
      title: "Produk A",
      body: "Deskripsi singkat produk A.",
      footer: "Rp 150.000",
      buttons: [
        { type: "url", text: "Lihat Detail", url: "https://example.com/a" },
        { type: "quick_reply", text: "Pesan", id: ".order product-a" },
      ],
    },
    {
      image: "https://example.com/product2.jpg",
      title: "Produk B",
      body: "Deskripsi singkat produk B.",
      footer: "Rp 200.000",
      buttons: [
        { type: "url", text: "Lihat Detail", url: "https://example.com/b" },
        { type: "quick_reply", text: "Pesan", id: ".order product-b" },
      ],
    },
  ],
});
```

**Carousel button types:**

| `type`            | Required fields       | Description                            |
| ----------------- | --------------------- | -------------------------------------- |
| `"quick_reply"`   | `text`, `id`          | Returns `id` as a message when tapped. |
| `"url"`           | `text`, `url`         | Opens a URL.                           |
| `"call"`          | `text`, `phoneNumber` | Initiates a phone call.                |
| `"copy"`          | `text`, `code`        | Copies `code` to clipboard.            |
| `"single_select"` | `title`, `sections`   | Opens an in-card list selector.        |

---

#### Extracting interactive responses

When a user taps a quick-reply or list button, the bot receives a response message. Use `extractInteractiveResponse` to get the `id` back:

```ts
import { extractInteractiveResponse } from "@lib/interactive";

// In an event handler or the message loop:
const responseId = extractInteractiveResponse(message);
if (responseId) {
  // responseId is the button's `id` string, e.g. ".ping"
  // The app.ts message loop already dispatches these as commands automatically.
}
```

---

## 11. Registering & Generating Plugins

### Static generation (production)

After adding or renaming a plugin file, regenerate the static registry:

```bash
bun run generate
```

This writes `src/generated/commands.js` and `src/generated/events.js`. These files are **auto-generated — do not edit them manually**.

### File naming conventions

| Convention                   | Why                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Use `.ts` extension          | Bun transpiles TypeScript natively.                                                            |
| File name ≠ command name     | The name comes from `Command.name`, not the filename. Use a descriptive filename that matches. |
| One default export per file  | Each file is exactly one command or one event plugin.                                          |
| Subdirectories are supported | `commands/group/kick.ts` is valid; subdirectory names are ignored.                             |

### Entry point

The bot starts in `index.ts`, which calls `startApp()`. Commands and events are loaded there:

```ts
// index.ts (typical shape)
import { startApp } from "@src/app";
import { CommandRegistry } from "@core/command/registry";
import { EventRegistry } from "@core/events/registry";
import { loadStaticCommands } from "@core/command/staticLoader";
import { loadStaticEvents } from "@core/events/staticLoader";

const registry = new CommandRegistry();
const eventRegistry = new EventRegistry();

loadStaticCommands(registry);
loadStaticEvents(eventRegistry);

await startApp(registry, eventRegistry);
```

---

## 12. Hot-Reload (Development)

The `DynamicLoader` watches `commands/` and `EventDynamicLoader` watches `events/` for file changes and reloads plugins without restarting the bot.

```ts
// Enabling hot-reload (development only)
import { DynamicLoader } from "@core/command/dynamicLoader";
import { EventDynamicLoader } from "@core/events/dynamicLoader";

const loader = new DynamicLoader(registry);
await loader.load();
await loader.watch();

const eventLoader = new EventDynamicLoader(eventRegistry);
await eventLoader.load();
await eventLoader.watch();
```

### Hot-reload lifecycle

1. File saved → debounced (150 ms) → `loadFile()` runs.
2. The new module is validated.
3. `registry.replace()` atomically swaps the old command.
4. The old command's `dispose()` hook is called (if defined).
5. If validation fails, the **previous command stays registered** and the error is logged.

### `dispose()` — cleaning up timers and handles

```ts
// commands/tools/scheduler.ts
import { defineCommand } from "@core/command";

let interval: ReturnType<typeof setInterval> | undefined;

export default defineCommand({
  name: "scheduler",
  execute: async (ctx) => {
    interval ??= setInterval(() => {
      ctx.log.info("tick");
    }, 60_000);
    await ctx.send.text("Scheduler running.");
  },

  // Called by hot-reload when this module is replaced.
  dispose: () => {
    clearInterval(interval);
    interval = undefined;
  },
});
```

> **Production note:** Use the static loader in production. The hot-reload system imports modules via URL cache-busting, so each reload leaves one unreclaimable module record in Bun's module registry. Over hundreds of reloads this adds up. Keep hot-reload for development only.

---

## 13. Recipes & Common Patterns

### Fetching group metadata safely

```ts
execute: async (ctx) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya untuk group.");
    return;
  }

  const meta = await ctx.sock.groupMetadata(ctx.chat.jid);
  const participantCount = meta.participants.length;
  await ctx.send.text(`Group *${meta.subject}* memiliki ${participantCount} anggota.`);
},
```

### Replying to a quoted message

```ts
execute: async (ctx) => {
  const quoted =
    ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) {
    await ctx.send.text("Balas pesan yang ingin diedit.");
    return;
  }
  // process `quoted`...
},
```

### Downloading media from a quoted message

```ts
import { downloadMediaMessage } from "baileys";

execute: async (ctx) => {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo;
  if (!quoted?.quotedMessage?.imageMessage) {
    await ctx.send.text("Balas gambar untuk mengonversinya ke stiker.");
    return;
  }

  const buffer = await downloadMediaMessage(
    {
      key: { remoteJid: ctx.chat.jid, ...quoted },
      message: quoted.quotedMessage,
    },
    "buffer",
    {},
    { logger: ctx.log as never, reuploadRequest: ctx.sock.updateMediaMessage },
  );

  await ctx.send.sticker(buffer as Buffer);
},
```

### Sending a typing indicator

```ts
execute: async (ctx) => {
  await ctx.sock.sendPresenceUpdate("composing", ctx.chat.jid);
  // ... do slow work ...
  await ctx.sock.sendPresenceUpdate("paused", ctx.chat.jid);
  await ctx.send.text("Done!");
},
```

### Reading mentions from a message

```ts
import { getGroupMentions } from "@src/utils/group";

execute: async (ctx) => {
  const mentioned = getGroupMentions(ctx);
  if (mentioned.length === 0) {
    await ctx.send.text("Mention seseorang untuk melanjutkan.");
    return;
  }
  await ctx.send.text(`Kamu mention: ${mentioned.join(", ")}`);
},
```

### Paginating results with quick-reply buttons

```ts
execute: async (ctx) => {
  const page = ctx.args!.valueParsed("--page", Number) ?? 1;
  const results = await fetchPage(ctx.args!.rest().join(" "), page);

  await ctx.send.text(formatResults(results));

  if (results.hasMore) {
    await ctx.send.interactive.quickReply({
      body: `Halaman ${page} dari ${results.totalPages}`,
      buttons: [
        { text: "← Sebelumnya", id: `.mycommand --page ${page - 1}` },
        { text: "Selanjutnya →", id: `.mycommand --page ${page + 1}` },
      ].filter((b, i) => !(i === 0 && page <= 1)),
    });
  }
},
```

### Sharing state between an event plugin and a command

Export a plain `Map` or `Set` from a shared module:

```ts
// src/state/afk.ts
export const afkUsers = new Map<string, { reason: string; since: number }>();
```

```ts
// commands/tools/afk.ts
import { afkUsers } from "@src/state/afk";
// set afkUsers.set(ctx.sender.jid, { reason, since: Date.now() })
```

```ts
// events/afk-check.ts
import { afkUsers } from "@src/state/afk";
// check afkUsers in "message.received"
```

---

## 14. Troubleshooting FAQ

**My command never runs even though the file exists.**
→ Did you run `bun run generate`? The static registry must be regenerated after adding a new file. Check `src/generated/commands.js` to confirm the import was added.

**`ctx.args` is `undefined` in middleware.**
→ `args` is set by the dispatcher, so it is `undefined` during the global middleware phase and defined by the time per-command middleware and `execute` run. If you need args in global middleware, parse them manually from `ctx.rawArgs`.

**My aliases bypass the cooldown.**
→ The default `cooldown` middleware keys on `ctx.name`, which is the alias name, not the canonical command name. Use `ctx.command?.name` (requires passing `ctx.command` from the dispatcher; see the audit note in §4.1) or key on `ctx.args?.descriptions()[0]?.name` as a workaround.

**Interactive buttons don't appear on WhatsApp Web.**
→ Native-flow buttons are not consistently rendered by WhatsApp Web and older desktop clients. They work reliably on Android and iOS. Use plain text as a fallback for Web users.

**Hot-reload isn't picking up my changes.**
→ Ensure the watcher is started in development mode and that the file is inside `commands/` or `events/`. Check the console for `Watcher error:` messages. If the file has a syntax error, the watcher will log the error and keep the previous version — fix the error and save again.

**`sock.groupMetadata()` throws `rate-overlimit`.**
→ You are calling it on every command without caching. Add a TTL cache (see §13) or use the `cachedGroupMetadata` option on `makeWASocket`.

**The bot sends messages but then goes silent after a disconnect.**
→ This is the stale-socket bug described in the audit. The `bot()` function in `src/app.ts` only registers listeners once and doesn't rebind them after a reconnect. See the `Session` class in the audit's refactored code for the fix.

**`downloadMediaMessage` throws `"No matching keys"` or `"decrypt failed"`.**
→ The message was received before the Signal session was established, or the media keys have rotated. Call `ctx.sock.updateMediaMessage(message)` to re-request the keys from WhatsApp before downloading.

**My event plugin handles `"message.received"` but also dispatches commands. Won't that double-execute?**
→ No. The main `app.ts` message loop and your event plugin both receive the same `"message.received"` event, but `parseCommand` will only match a message that starts with the prefix. As long as your plugin doesn't also call `dispatcher.dispatch()`, there is no duplication.
