# 01 — Command Plugins

A command plugin is a TypeScript file with a **default export** of a `Command` object.
It lives anywhere inside `commands/` and is picked up automatically.

---

## Minimal example

```ts
// commands/tools/ping.ts
import { defineCommand } from "@core/command";

export default defineCommand({
  name: "ping",
  description: "Replies with pong.",
  category: "tools",
  async execute(ctx) {
    await ctx.send.text("Pong! 🏓");
  },
});
```

---

## The `Command` type — all fields

```ts
type Command = {
  // ── Required ────────────────────────────────────────────────────────
  name: string; // primary trigger word (lowercase, no prefix)
  execute: (ctx: CommandContext) => Promise<void>;

  // ── Optional metadata ────────────────────────────────────────────────
  aliases?: string[]; // alternative trigger words
  category?: Category; // used by the .menu command
  description?: string; // shown in --help and the menu
  usage?: string[]; // example invocations shown in --help

  // ── Behaviour ────────────────────────────────────────────────────────
  middleware?: Middleware[]; // per-command middleware chain
  flags?: FlagSpec[]; // typed flag declarations (see 03-flags-and-args.md)

  // ── Lifecycle ────────────────────────────────────────────────────────
  dispose?: () => void | Promise<void>; // called by the hot-reload loader on unload
};
```

---

## `defineCommand` helper

`defineCommand` is a typed pass-through. It provides IDE autocompletion with zero runtime overhead.

```ts
import { defineCommand } from "@core/command";

export default defineCommand({
  name: "example",
  async execute(ctx) {},
});
```

---

## Categories

| Value           | Menu heading              |
| --------------- | ------------------------- |
| `tools`         | Tools                     |
| `downloader`    | Downloader                |
| `search`        | Search                    |
| `admin`         | Group administration      |
| `nsfw`          | NSFW                      |
| `ai`            | AI                        |
| `game`          | Game                      |
| `maker`         | Maker                     |
| `uncategorized` | Uncategorized _(default)_ |

---

## Aliases

A command can have one or more aliases. They are registered alongside the primary name and
trigger the exact same `execute` function.

```ts
export default defineCommand({
  name: "sticker",
  aliases: ["stiker", "s"],
  async execute(ctx) { … },
});
```

> Aliases share one cooldown bucket with the primary name (requires the patched `cooldown`
> middleware — see [04-middleware.md](./04-middleware.md)).

---

## Usage hints

`usage` is an array of example invocations shown in the auto-generated `--help` output.

```ts
export default defineCommand({
  name: "weather",
  usage: [
    ".weather Jakarta",
    ".weather London --unit imperial",
  ],
  …
});
```

---

## The `dispose` hook

`dispose` is called by the hot-reload loader before replacing a module. Use it to clear
timers, close handles, or flush caches that the command module holds.

```ts
let timer: ReturnType<typeof setTimeout> | undefined;

export default defineCommand({
  name: "remind",
  async execute(ctx) {
    timer = setTimeout(() => {}, 60_000);
    await ctx.send.text("Scheduled.");
  },
  dispose() {
    clearTimeout(timer);
  },
});
```

---

## File and naming conventions

- **One command per file.** Name the file after the command for clarity (`kick.ts` for `.kick`).
- **Group related commands into subdirectories:**
  ```
  commands/
  ├── group/
  │   ├── kick.ts
  │   ├── promote.ts
  │   └── demote.ts
  └── downloader/
      ├── aio.ts
      └── github.ts
  ```
- After adding or removing files, run `bun run generate` to regenerate
  `src/generated/commands.js`. In dev mode this happens automatically via hot-reload.
- In **production** the static loader is used. In **development** the dynamic loader
  hot-reloads on every file save.
- Never import one command file from another. Shared utilities belong in `lib/` or
  `src/utils/`.

---

## Full example with all optional fields

```ts
// commands/search/web.ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { cooldown } from "@src/middlewares/cooldown";
import { ownerOnly } from "@src/middlewares/owner";

const LIMIT = FlagSpec.value(["--limit", "-l"]).description(
  "Max results (default 5).",
);
const SAFE = FlagSpec.bool(["--safe", "-s"]).description("Enable safe search.");

export default defineCommand({
  name: "websearch",
  aliases: ["ws", "search"],
  category: "search",
  description: "Search the web.",
  usage: [
    ".websearch cats",
    ".websearch cats --limit 10",
    ".websearch violence --safe",
  ],
  flags: [LIMIT, SAFE],
  middleware: [cooldown(5_000)],

  async execute(ctx) {
    const query = ctx.args!.rest().join(" ");
    if (!query) {
      await ctx.send.text("Usage: .websearch <query>");
      return;
    }
    const limit = ctx.args!.valueParsed("--limit", Number) ?? 5;
    const safe = ctx.args!.flag("--safe");
    // … perform search …
    await ctx.send.text(
      `Results for "${query}" (limit=${limit}, safe=${safe})`,
    );
  },

  dispose() {
    // clean up any open fetch streams or caches
  },
});
```
