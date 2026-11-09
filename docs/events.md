# Event Plugins

Event plugins let you react to WhatsApp and bot lifecycle events without changing the command dispatcher.

Create a `.ts` or `.js` file inside `events/` and export a plugin with `defineEvent()`.

```ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "group-welcome",
  events: {
    "group.participant.join": async ({ sock, event }) => {
      await sock.sendMessage(event.groupJid, {
        text: `Welcome ${event.participants.length} new member(s)!`,
      });
    },

    "message.received": async ({ event, log }) => {
      if (event.text) log.info(`Message received: ${event.text}`);
    },
  },
});
```

## Event context

Every handler receives:

- `sock` — the session's Baileys socket.
- `log` — the session logger.
- `pluginName` — the registered event plugin name.
- `event` — the payload associated with the event name.

## Internal events

Internal events use normalized payloads intended to keep common plugin code independent of Baileys details.

| Event | Payload |
| --- | --- |
| `message.received` | `message`, `text`, `chat`, `sender` |
| `group.participant.join` | `groupJid`, `participants`, `author` |
| `group.participant.leave` | `groupJid`, `participants`, `author` |
| `connection.open` | `userJid` |
| `connection.close` | `reason` |

## Raw Baileys events

Raw events are prefixed with `baileys.` and preserve the original Baileys payload and types.

Currently exposed events:

- `baileys.messages.upsert`
- `baileys.connection.update`
- `baileys.group-participants.update`

Use raw events when an internal event does not expose the information your plugin needs.

## Execution behavior

- All handlers for an event are started in parallel.
- A handler failure is logged and does not prevent other handlers from running.
- Dispatch waits until all handlers have settled.
- Handler completion order is not guaranteed. Avoid relying on shared mutable state between handlers.

## Development mode

Development mode watches the `events/` directory. Adding, editing, or deleting an event plugin loads, replaces, or unregisters its handlers without restarting the WhatsApp session.
