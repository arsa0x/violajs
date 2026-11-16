# 08 — Event Plugins

An event plugin is a TypeScript file that **default-exports** an `EventPlugin` object.
It lives anywhere inside `events/` and is loaded by the static generator or the hot-reload watcher.

---

## Minimal example

```ts
// events/logger.ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "message-logger",
  events: {
    "message.received": async (ctx) => {
      ctx.log.info(`[${ctx.event.chat.jid}] ${ctx.event.text}`);
    },
  },
});
```

---

## The `EventPlugin` type

```ts
type EventPlugin = {
  name: string; // unique plugin identifier (must not clash)
  events: EventHandlers; // map of event name → async handler
};

type EventHandlers = {
  [K in EventName]?: (ctx: EventContext<EventMap[K]>) => Promise<void>;
};
```

---

## `defineEvent` helper

`defineEvent` is a typed pass-through identical to `defineCommand` but for events.
It provides IDE autocompletion with zero runtime overhead.

```ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "my-plugin",
  events: { … },
});
```

---

## Built-in event names and payloads

### Internal events (emitted by violajs)

| Event name                | Payload                               | When it fires                 |
| ------------------------- | ------------------------------------- | ----------------------------- |
| `message.received`        | `{ message, text, chat, sender }`     | Every inbound non-bot message |
| `group.participant.join`  | `{ groupJid, participants, author? }` | A member joins a group        |
| `group.participant.leave` | `{ groupJid, participants, author? }` | A member leaves a group       |
| `connection.open`         | `{ userJid }`                         | Socket connected to WhatsApp  |
| `connection.close`        | `{ reason? }`                         | Socket disconnected           |

#### `message.received` payload

```ts
{
  message: WAMessage;
  text: string; // extracted text (empty for media-only messages)
  chat: {
    jid: string;
    isGroup: boolean;
  }
  sender: {
    jid: string;
  }
}
```

#### `group.participant.join` / `group.participant.leave` payload

```ts
{
  groupJid:     string;    // the group's JID
  participants: string[];  // array of member JIDs who joined/left
  author?:      string;    // JID of the admin who added/removed (undefined for self-join/leave)
}
```

#### `connection.open` payload

```ts
{
  userJid: string;
} // the bot's own JID
```

#### `connection.close` payload

```ts
{ reason?: string }  // the numeric disconnect code as a string, or undefined
```

---

### Raw Baileys events (passed through without transformation)

| Event name                          | Original Baileys event      | When it fires                      |
| ----------------------------------- | --------------------------- | ---------------------------------- |
| `baileys.messages.upsert`           | `messages.upsert`           | New messages batch from WhatsApp   |
| `baileys.connection.update`         | `connection.update`         | Low-level connection state changed |
| `baileys.group-participants.update` | `group-participants.update` | Group membership changed           |

Use raw events only when you need Baileys-specific fields that the internal events do not expose.

---

## Subscribing to multiple events

A single plugin can handle as many events as needed.

```ts
// events/group.ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "group-lifecycle",
  events: {
    "group.participant.join": async (ctx) => {
      const { groupJid, participants } = ctx.event;
      for (const jid of participants) {
        await ctx.sock.sendMessage(groupJid, {
          text: `👋 Welcome, @${jid.split("@")[0]}!`,
          mentions: [jid],
        });
      }
    },

    "group.participant.leave": async (ctx) => {
      const { groupJid, participants } = ctx.event;
      await ctx.sock.sendMessage(groupJid, {
        text: `👋 ${participants.length} member(s) have left.`,
      });
    },

    "connection.open": async (ctx) => {
      ctx.log.info(`Connected as ${ctx.event.userJid}`);
    },
  },
});
```

---

## Error isolation

If an event handler throws, the `EventDispatcher` catches the error, logs it under the
plugin's name, and **continues dispatching** to other plugins for the same event.

A crashing event plugin does **not** affect command handling or other plugins.

---

## File and naming conventions

- One `EventPlugin` per file; name the file after the plugin.
- Subdirectories are supported: `events/group/greeter.ts`.
- After adding or removing files run `bun run generate` to regenerate `src/generated/events.js`.
- **Plugin names must be unique.** A duplicate name throws at registration time.

---

## Registering vs. discovering

After running `bun run generate`, the plugin appears in `src/generated/events.js`:

```js
// src/generated/events.js  (auto-generated — do not edit)
import _0 from "@events/group.ts";
export const events = [_0];
```

The static loader (`src/core/events/staticLoader.ts`) registers every plugin in that array.
In dev mode the dynamic loader hot-reloads the file on every save.
