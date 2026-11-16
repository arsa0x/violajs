# 06 — Flags & Args

Flags let commands accept structured options. Declare them with `FlagSpec`, then read the
parsed result from `ctx.args` inside `execute`.

---

## FlagSpec kinds

| Kind    | Factory                 | Stores                  | Example input        |
| ------- | ----------------------- | ----------------------- | -------------------- |
| `bool`  | `FlagSpec.bool(names)`  | `true` when present     | `--verbose`          |
| `value` | `FlagSpec.value(names)` | A single string         | `--limit 10`         |
| `list`  | `FlagSpec.list(names)`  | Comma-separated strings | `--tags news,sports` |
| `json`  | `FlagSpec.json(names)`  | Any JSON value          | `--data {"k":1}`     |

---

## Declaring flags

Every factory accepts a single string or an array of aliases.
Chain `.description()` to add help text shown by `--help`.

```ts
import { FlagSpec } from "@lib/args";

const LIMIT = FlagSpec.value(["--limit", "-l"]).description(
  "Max results (default 5).",
);
const VERBOSE = FlagSpec.bool(["--verbose", "-v"]).description(
  "Print extra detail.",
);
const TAGS = FlagSpec.list(["--tags", "-t"]).description(
  "Filter by tag (comma-separated).",
);
const FILTER = FlagSpec.json(["--filter", "-f"]).description(
  "JSON filter object.",
);
```

Attach them to the command:

```ts
export default defineCommand({
  name: "search",
  flags: [LIMIT, VERBOSE, TAGS, FILTER],
  async execute(ctx) { … },
});
```

> **Reserved names:** `--help` and `-h` are reserved by the dispatcher.
> Declaring them in `flags` throws at registration time.

---

## Reading parsed values inside `execute`

### `bool` — was the flag present?

```ts
const verbose = ctx.args!.flag("--verbose"); // boolean
```

### `value` — single string

```ts
const limit = ctx.args!.value("--limit"); // string | undefined
const n = ctx.args!.valueParsed("--limit", Number); // number | undefined
const page = ctx.args!.valueParsed("--page", parseInt); // number | undefined
```

`valueParsed` calls the supplied function and returns `undefined` if it throws.

### `list` — array of strings

```ts
const tags = ctx.args!.list("--tags"); // string[]  (empty if not supplied)
const tagsOrUndef = ctx.args!.listNonEmpty("--tags"); // string[] | undefined
const tagsRaw = ctx.args!.listStr("--tags"); // alias for list()
```

Input `--tags news,sports,tech` → `["news", "sports", "tech"]`.

### `json` — arbitrary JSON

```ts
const raw = ctx.args!.json("--filter"); // unknown | undefined

// With runtime validation:
const filter = ctx.args!.jsonParsed("--filter", (v) => {
  if (typeof v !== "object" || v === null) throw new Error("Expected object");
  return v as Record<string, unknown>;
}); // Record<string, unknown> | undefined

// Check for a parse error:
const err = ctx.args!.jsonError("--filter"); // JsonParseError | undefined
if (err) {
  await ctx.send.text(`Invalid JSON for --filter: ${String(err.error)}`);
  return;
}
```

### Positionals — tokens that are not flags

```ts
// Message: ".search cats dogs --limit 5"
const first = ctx.args!.positional(0); // "cats"
const second = ctx.args!.positional(1); // "dogs"
const all = ctx.args!.rest(); // ["cats", "dogs"]
const tail = ctx.args!.restFrom(1); // ["dogs"]
```

### Presence check

```ts
// True when the flag appeared at all, even without a value
const hasLimit = ctx.args!.has("--limit"); // boolean
```

---

## Alias resolution

All `Args` methods accept any name from the flag's alias list; they always resolve to the
canonical (first) name internally.

```ts
// LIMIT = FlagSpec.value(["--limit", "-l"])
ctx.args!.value("--limit") === ctx.args!.value("-l"); // true
```

---

## Full example

```ts
// commands/nsfw/pornhub.ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { cooldown } from "@src/middlewares/cooldown";

const PAGE = FlagSpec.value(["--page", "-p"]).description(
  "Page number (default 1).",
);
const ORDER = FlagSpec.value(["--order", "-o"]).description(
  "Sort: newest | rating | mostviewed.",
);
const TAGS = FlagSpec.list(["--tags", "-t"]).description(
  "Filter by tag (comma-separated).",
);

export default defineCommand({
  name: "phsearch",
  aliases: ["phs"],
  category: "nsfw",
  description: "Search Pornhub.",
  usage: [
    ".phsearch milf",
    ".phsearch milf --page 2",
    ".phsearch milf --order rating --tags amateur,hd",
  ],
  flags: [PAGE, ORDER, TAGS],
  middleware: [cooldown(10_000)],

  async execute(ctx) {
    const query = ctx.args!.rest().join(" ");
    if (!query) {
      await ctx.send.text(
        "Usage: .phsearch <query> [--page N] [--order newest|rating]",
      );
      return;
    }

    const page = ctx.args!.valueParsed("--page", Number) ?? 1;
    const order = ctx.args!.value("--order") ?? "newest";
    const tags = ctx.args!.list("--tags"); // may be empty

    // … perform search with page, order, tags …
    await ctx.send.text(
      `Searching: "${query}" page=${page} order=${order} tags=[${tags.join(",")}]`,
    );
  },
});
```

---

## `--help` flag (built-in)

Every command automatically supports `--help` / `-h`. When the user sends `.command --help`,
the dispatcher renders a help message using `generateCommandHelp` and **does not** call
`execute`. The help output includes:

- `description`
- `aliases`
- `category`
- All declared `flags` with their names, types, and descriptions

You do not need to handle `--help` yourself.
