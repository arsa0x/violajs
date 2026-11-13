# 10 — Hot-Reload & Dev Workflow

---

## How dynamic loading works

In development mode (`bun run dev`), `DynamicLoader` and `EventDynamicLoader` watch
`commands/` and `events/` with `fs.watch`. When a file is saved:

1. **Debounce** — the loader waits 150 ms to avoid reacting to partial writes.
2. **Import** — the new module is imported via a versioned URL (`?v=<mtime>.<seq>`)
   to bypass Bun's import cache.
3. **Validate** — `registry.replace()` validates the new command **before** removing
   the old one. A syntax error or bad export leaves the previous command live.
4. **Dispose** — the old module's `dispose()` hook is called to release timers,
   connections, or other resources it holds.
5. **Register** — the new command takes the old one's slot in the registry.

> **Production note:** ESM module records are never garbage-collected in Bun. Each
> hot-reload leaves one tiny module record in memory. For production use the static
> loader and restart the process to deploy changes.

---

## Project scripts

| Script                  | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `bun run generate`      | Regenerates `src/generated/commands.js`, `events.js`, and `menu.js` |
| `bun run dev`           | Starts the bot with hot-reload (dynamic loader)                     |
| `bun run start`         | Starts the bot with the static loader (production)                  |
| `bun run build`         | Compiles the bot to a single binary in `dist/violajs/`              |
| `bun run docs:generate` | Regenerates `docs/commands.md` from command metadata                |

---

## Session management (CLI flags)

```bash
# Create a new session and start pairing
bun run start create --session bot1

# Start the default session
bun run start

# Start a named session
bun run start --session bot1

# Start all existing sessions in parallel
bun run start --all

# Pair using a phone number instead of QR (Baileys pairing-code flow)
bun run start --session bot1 --pairing --phone 628123456789

# Delete a session (removes the SQLite auth DB)
bun run start delete --session bot1

# Delete all sessions
bun run start delete --all
```

---

## The `dispose` hook

Declare `dispose` on a command to release resources when the module is hot-replaced.
The loader calls it before removing the command from the registry.

```ts
// Without dispose: the interval from the old module version keeps firing
// even after the new version is loaded.

let interval: ReturnType<typeof setInterval> | undefined;

export default defineCommand({
  name: "heartbeat",

  async execute(ctx) {
    if (interval) {
      await ctx.send.text("Already running.");
      return;
    }
    interval = setInterval(() => ctx.log.info("❤️"), 60_000);
    await ctx.send.text("Heartbeat started.");
  },

  dispose() {
    clearInterval(interval);
    interval = undefined;
    // Also close any open fetch streams, database connections, etc.
  },
});
```

`dispose` can be `async`:

```ts
dispose: async () => {
  await db.close();
},
```

---

## TypeScript path aliases

Configured in `tsconfig.json` and `bunfig.toml`:

| Alias        | Resolves to  |
| ------------ | ------------ |
| `@/`         | Project root |
| `@src/`      | `src/`       |
| `@core/`     | `src/core/`  |
| `@lib/`      | `lib/`       |
| `@utils/`    | `src/utils/` |
| `@commands/` | `commands/`  |
| `@events/`   | `events/`    |

---

## Static vs. dynamic loader

|                                        | Static loader                      | Dynamic loader                |
| -------------------------------------- | ---------------------------------- | ----------------------------- |
| **When to use**                        | Production                         | Development                   |
| **How commands are registered**        | Generated `commands.js` import     | `fs.watch` + versioned import |
| **New file picked up without restart** | ❌ (requires `generate` + restart) | ✅ (on save)                  |
| **Memory per reload**                  | —                                  | +1 tiny ESM record            |
| **TypeScript aliases work**            | ✅                                 | ✅                            |
| **`dispose` called**                   | Only on process exit               | ✅ before each hot-replace    |

---

## Best practices

### Keep commands stateless when possible

```ts
// ✅ Stateless — no dispose needed
export default defineCommand({
  name: "ping",
  async execute(ctx) {
    await ctx.send.text("Pong!");
  },
});

// ⚠️ Stateful — always provide dispose()
let cache: Map<string, string> | undefined;
export default defineCommand({
  name: "cached",
  async execute(ctx) {
    cache ??= new Map();
    // …
  },
  dispose() {
    cache?.clear();
    cache = undefined;
  },
});
```

### Validate env vars inside `execute`, not at module level

```ts
// ❌ Bad: a missing key crashes the whole bot at startup
const API_KEY = process.env.MY_API_KEY!;

// ✅ Good: fail gracefully per invocation
async execute(ctx) {
  const key = process.env.MY_API_KEY;
  if (!key) {
    await ctx.send.text("This command is not configured. Contact the bot owner.");
    return;
  }
  // …
}
```

### Guard error replies

```ts
// ✅ Always .catch() the error reply so a send failure
// doesn't create a second unhandled rejection.
await ctx.send.text("Something went wrong.").catch(() => {});
```

### Never import one command file from another

Shared code belongs in `lib/` or `src/utils/`. Circular imports between command files
break the hot-reload system.

```
lib/
├── my-shared-util.ts    ← shared between commands
commands/
├── tools/
│   ├── foo.ts           ← imports from @lib/my-shared-util
│   └── bar.ts           ← imports from @lib/my-shared-util
```

### Test interactive buttons on a real phone

Native-flow buttons may not render on WhatsApp Web or Desktop.
Always verify on a physical Android or iOS device before shipping.

### Use `bun run generate` before committing

The generated files (`src/generated/commands.js`, `events.js`, `menu.js`) must be
up to date in the repository so production deploys can use the static loader.

```bash
bun run generate && git add src/generated/
```
