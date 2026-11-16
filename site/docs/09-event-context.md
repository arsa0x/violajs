# 09 — EventContext API

Event handlers receive `ctx: EventContext<T>` where `T` is the payload type of the event.

---

## Properties

| Property         | Type       | Description                                         |
| ---------------- | ---------- | --------------------------------------------------- |
| `ctx.event`      | `T`        | The event payload (shape depends on the event name) |
| `ctx.pluginName` | `string`   | The name of the owning plugin                       |
| `ctx.sock`       | `WASocket` | The active Baileys socket                           |
| `ctx.log`        | `Log`      | Session-scoped logger                               |

---

## Accessing the event payload

The shape of `ctx.event` is fully typed based on the event name you subscribed to.

```ts
// "message.received"
ctx.event.message; // WAMessage
ctx.event.text; // string
ctx.event.chat; // { jid: string; isGroup: boolean }
ctx.event.sender; // { jid: string }

// "group.participant.join"
ctx.event.groupJid; // string
ctx.event.participants; // string[]
ctx.event.author; // string | undefined

// "connection.open"
ctx.event.userJid; // string
```

---

## Sending messages from event handlers

`EventContext` does not have a `send` helper (that is scoped to a command's reply target).
Use `ctx.sock` directly, or construct a `Send` instance if you need the richer API.

### Using the socket directly

```ts
"group.participant.join": async (ctx) => {
  const { groupJid, participants } = ctx.event;

  for (const jid of participants) {
    await ctx.sock.sendMessage(groupJid, {
      text: `Welcome, @${jid.split("@")[0]}!`,
      mentions: [jid],
    });
  }
},
```

### Using the `Send` helper

```ts
import { Send } from "@lib/send";

"message.received": async (ctx) => {
  const { message } = ctx.event;
  const jid = message.key.remoteJid!;

  // Build a Send instance for the inbound message's chat
  const send = new Send(ctx.sock, message, jid);
  await send.text("Auto-reply: thanks for your message!");
},
```

---

## Logging

```ts
ctx.log.info("Event fired", ctx.event);
ctx.log.warn("Something unexpected happened");
ctx.log.error("Handler failed", error);
ctx.log.debug("Raw event", ctx.event);
```

---

## Error handling

Uncaught errors inside a handler are caught by the `EventDispatcher` and logged — they do
not propagate. If you have cleanup to do on error, use a local try/catch:

```ts
"connection.open": async (ctx) => {
  try {
    await registerBotInDatabase(ctx.event.userJid);
    ctx.log.info("Bot registered in database.");
  } catch (error) {
    ctx.log.error("Registration failed:", error);
    // return here; the dispatcher will not re-throw
  }
},
```

---

## Accessing group metadata

```ts
"group.participant.join": async (ctx) => {
  const { groupJid } = ctx.event;

  let groupName = groupJid;
  try {
    const meta = await ctx.sock.groupMetadata(groupJid);
    groupName = meta.subject;
  } catch {
    // groupMetadata can fail when the bot was just added; degrade gracefully
  }

  await ctx.sock.sendMessage(groupJid, {
    text: `You joined *${groupName}*. Type .help for commands.`,
  });
},
```

---

## Accessing raw Baileys events

For advanced use cases, subscribe to raw Baileys events to access fields not exposed by
the internal event wrappers:

```ts
"baileys.messages.upsert": async (ctx) => {
  const { messages, type } = ctx.event; // BaileysEventMap["messages.upsert"]
  if (type !== "notify") return;
  ctx.log.debug(`Received ${messages.length} message(s).`);
},

"baileys.connection.update": async (ctx) => {
  const { connection, qr } = ctx.event;
  if (qr) ctx.log.info("New QR code available.");
  if (connection === "open") ctx.log.info("Connected!");
},

"baileys.group-participants.update": async (ctx) => {
  const { id, action, participants } = ctx.event;
  ctx.log.debug(`Group ${id}: ${action} → ${participants.join(", ")}`);
},
```

---

## Full type reference

```ts
class EventContext<TEvent> {
  event: TEvent;
  pluginName: string;
  sock: WASocket;
  log: Log;
}

interface Log {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}
```
