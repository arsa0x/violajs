# 07 — Middleware

Middleware is an async function `(ctx, next) => Promise<void>` that wraps command execution.
Middleware runs in declaration order. Calling `next()` passes control to the next layer.
Not calling `next()` stops the chain — the command never executes.

```ts
type Middleware = (
  ctx: CommandContext,
  next: () => Promise<void>,
) => Promise<void>;
```

---

## Applying middleware

Middleware can be applied at two levels:

1. **Global** — passed to `CommandDispatcher`, runs before every command.
2. **Per-command** — listed in `command.middleware`, runs after global middleware.

```ts
// Per-command (most common)
export default defineCommand({
  name: "kick",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) { … },
});
```

```ts
// Global (src/app.ts)
const dispatcher = new CommandDispatcher(registry, [
  logger(log),
  cooldown(1_000),
]);
```

---

## Execution order

Given `globalMiddleware = [A]` and `command.middleware = [B, C]`:

```
Request:  A → B → C → execute()
Response: A ← B ← C             (after next() returns in each layer)
```

Code **before** `await next()` runs on the way **in**.
Code **after** `await next()` runs on the way **out** (useful for timing, cleanup).

---

## Built-in middleware

| Import                         | Factory            | Effect                                 |
| ------------------------------ | ------------------ | -------------------------------------- |
| `@src/middlewares/owner`       | `ownerOnly()`      | Reject if `!ctx.sender.isOwner`        |
| `@src/middlewares/group`       | `groupOnly()`      | Reject if `!ctx.chat.isGroup`          |
| `@src/middlewares/group-admin` | `groupAdminOnly()` | Reject if sender is not a group admin  |
| `@src/middlewares/bot-admin`   | `botAdminOnly()`   | Reject if the bot is not a group admin |
| `@src/middlewares/cooldown`    | `cooldown(ms)`     | Per-user rate limit (milliseconds)     |
| `@src/middlewares/logger`      | `logger(log)`      | Log command name, sender, duration     |

### Usage examples

```ts
import { ownerOnly }      from "@src/middlewares/owner";
import { groupOnly }      from "@src/middlewares/group";
import { groupAdminOnly } from "@src/middlewares/group-admin";
import { botAdminOnly }   from "@src/middlewares/bot-admin";
import { cooldown }       from "@src/middlewares/cooldown";

export default defineCommand({
  name: "promote",
  // Requires: group chat + sender is admin + bot is admin
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) { … },
});

export default defineCommand({
  name: "ai",
  // 30-second per-user cooldown
  middleware: [cooldown(30_000)],
  async execute(ctx) { … },
});
```

---

## Writing custom middleware

A middleware factory is a function that returns a `Middleware`.

### Example: DM-only guard

```ts
// src/middlewares/private-only.ts
import type { Middleware } from "@src/types/middleware";

/** Rejects messages from group chats (DM-only command). */
export const privateOnly = (): Middleware => async (ctx, next) => {
  if (ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya dapat digunakan di DM.");
    return;
  }
  await next();
};
```

### Example: allow-list gate

```ts
// src/middlewares/allowlist.ts
import type { Middleware } from "@src/types/middleware";

export const allowList =
  (jids: Set<string>): Middleware =>
  async (ctx, next) => {
    if (!jids.has(ctx.sender.jid)) {
      await ctx.send.text("You are not permitted to use this command.");
      return;
    }
    await next();
  };
```

### Example: timing middleware

```ts
// src/middlewares/timing.ts
import type { Middleware } from "@src/types/middleware";

export const timing = (): Middleware => async (ctx, next) => {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(2);
  ctx.log.info(`${ctx.name} took ${ms}ms`);
};
```

### Example: require a quoted message

```ts
// src/middlewares/require-quoted.ts
import type { Middleware } from "@src/types/middleware";

export const requireQuoted = (): Middleware => async (ctx, next) => {
  const hasQuoted =
    !!ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!hasQuoted) {
    await ctx.send.text("Reply to a message to use this command.");
    return;
  }
  await next();
};
```

---

## Middleware error handling

Errors thrown inside `execute()` are caught by the dispatcher's outer `try/catch`. If you
want middleware to intercept or suppress errors, wrap `next()`:

```ts
export const errorBoundary = (): Middleware => async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.log.error(`Unhandled error in ${ctx.name}:`, error);
    await ctx.send
      .text("Terjadi kesalahan. Silakan coba lagi.")
      .catch(() => {});
    // Do NOT re-throw — the error is consumed here
  }
};
```

> **Tip:** Always guard the error-reply `ctx.send.text(…)` with `.catch(() => {})` so a
> send failure doesn't generate a second unhandled rejection.

---

## Combining middleware

```ts
export default defineCommand({
  name: "nsfw-search",
  middleware: [
    groupOnly(),          // must be in a group
    cooldown(15_000),     // once per 15 s per user
    allowList(BETA_JIDS), // beta users only
  ],
  async execute(ctx) { … },
});
```

Middleware runs left-to-right. The first one to not call `next()` short-circuits the rest.
