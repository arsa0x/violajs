# Argument Parser

The `@lib/args` module provides a declarative argument parser for commands in `violajs`. It is inspired by Viola's Rust argument parser and allows commands to define supported flags and access their parsed values through a consistent API.

The parser supports boolean flags, string values, comma-separated lists, JSON values, positional arguments, and flag aliases.

## Table of Contents

- [Overview](#overview)
- [Defining Flags](#defining-flags)
- [Flag Types](#flag-types)
- [Parsing Arguments](#parsing-arguments)
- [Accessing Parsed Arguments](#accessing-parsed-arguments)
- [Working with JSON](#working-with-json)
- [Positional Arguments](#positional-arguments)
- [Flag Descriptions](#flag-descriptions)
- [Parsing Rules](#parsing-rules)
- [Error Handling](#error-handling)
- [Integration with Commands](#integration-with-commands)
- [API Reference](#api-reference)

## Overview

The argument parser consists of two primary classes:

- `FlagSpec`: Defines a flag's names, type, and optional description.
- `Args`: Parses raw argument tokens according to the supplied flag specifications and provides methods for accessing the results.

Import the classes from `@lib/args`:

```ts
import { Args, FlagSpec } from "@lib/args";
```

The parser does not automatically process every incoming message. It only parses arguments when explicitly invoked, allowing the command dispatcher to decide when parsing should occur.

For example, a command can declare its supported flags:

```ts
const flags = [
  FlagSpec.value(["--search", "-s"]).description("Search for content"),
  FlagSpec.value(["--page", "-p"]).description("Page number"),
  FlagSpec.bool("--verbose").description("Enable verbose output"),
];
```

The same specifications can then be passed to `Args.parse()`.

## Defining Flags

Use `FlagSpec` to declare which flags a command supports.

Each flag must have at least one name. When multiple names are provided, the first name is the canonical name, and the remaining names are aliases.

```ts
const flags = [
  FlagSpec.value(["--search", "-s"]),
  FlagSpec.bool(["--verbose", "-v"]),
];
```

In this example:

- `--search` is the canonical name for the search flag.
- `-s` is an alias for `--search`.
- `--verbose` is the canonical name for the verbose flag.
- `-v` is an alias for `--verbose`.

Both the canonical name and its aliases can be used when parsing arguments. Parsed values are stored under the canonical name.

### Adding Descriptions

Use `.description()` to attach a human-readable description to a flag.

```ts
const searchFlag = FlagSpec.value(["--search", "-s"]).description(
  "Search for content by title",
);
```

Descriptions can be retrieved later through the `Args` description API.

### Flag Name Validation

`FlagSpec` validates its names when a specification is created.

The following conditions are enforced:

- A flag must have at least one name.
- Flag names cannot be empty after trimming whitespace.
- Names within the same flag specification must be unique.

The parser also rejects duplicate flag names across different specifications.

These checks help prevent ambiguous flag definitions.

## Flag Types

The parser supports four flag types:

| Type    | Factory method     | Purpose                                |
| ------- | ------------------ | -------------------------------------- |
| Boolean | `FlagSpec.bool()`  | Indicates whether a flag was supplied  |
| Value   | `FlagSpec.value()` | Stores a string value                  |
| List    | `FlagSpec.list()`  | Stores multiple comma-separated values |
| JSON    | `FlagSpec.json()`  | Parses a value as JSON                 |

### Boolean Flags

Boolean flags represent the presence or absence of an option.

```ts
const flags = [FlagSpec.bool(["--post", "-p"])];
```

Example input:

```text
--post
```

Check whether the flag was supplied:

```ts
if (args.flag("--post")) {
  // The --post flag is enabled.
}
```

Boolean flags do not consume subsequent tokens.

For example:

```text
--post 123
```

The parser recognizes `--post` as a boolean flag and leaves `123` as a positional argument.

Use `flag()` to check the boolean state and `has()` to check whether a flag appeared in the input.

### Value Flags

Value flags collect tokens until the next recognized flag or the end of the input.

```ts
const flags = [
  FlagSpec.value(["--search", "-s"]),
  FlagSpec.value(["--page", "-p"]),
];
```

Example input:

```text
--search enjo kouhai --page 2
```

The resulting values are:

```ts
args.value("--search"); // "enjo kouhai"
args.value("--page"); // "2"
```

This behavior allows a value flag to consume multiple tokens without requiring quotation marks.

If a value flag is supplied without a value, `has()` returns `true`, but `value()` returns `undefined`.

```text
--search
```

```ts
args.has("--search"); // true
args.value("--search"); // undefined
```

If the same value flag appears multiple times, the last non-empty value replaces the previous value.

For example:

```text
--search anime --search manga
```

The resulting value is `"manga"`.

### List Flags

List flags collect tokens until the next recognized flag, then split the collected text by commas.

```ts
const flags = [FlagSpec.list(["--tags", "-t"])];
```

Example input:

```text
--tags action, comedy, fantasy
```

Access the resulting list:

```ts
args.list("--tags");
// ["action", "comedy", "fantasy"]
```

Whitespace around each item is trimmed, and empty items are discarded.

List flags can be repeated. Values from subsequent occurrences are appended to the existing list.

Example input:

```text
--tags action,comedy --tags fantasy,romance
```

Result:

```ts
args.list("--tags");
// ["action", "comedy", "fantasy", "romance"]
```

The `list()` method returns a copy of the stored array, preventing callers from modifying the parser's internal list state.

### JSON Flags

JSON flags collect tokens and attempt to parse them as JSON.

```ts
const flags = [FlagSpec.json("--data")];
```

Example input:

```text
--data {"name":"example","enabled":true}
```

Retrieve the parsed JSON:

```ts
const data = args.json<{ name: string; enabled: boolean }>("--data");

if (data) {
  console.log(data.name);
}
```

Because JSON values may contain spaces, the parser joins collected tokens with spaces and attempts to parse the accumulated text.

Collection stops at the first valid JSON value or when another recognized flag is encountered.

If the JSON is invalid, the parser records the most recent parsing error. Use `jsonError()` to inspect it.

```ts
const error = args.jsonError("--data");

if (error) {
  console.error("Invalid JSON:", error.raw);
}
```

If no tokens follow a JSON flag, no JSON parsing error is recorded for that flag.

## Parsing Arguments

Use `Args.parse()` to parse an array of raw argument tokens against a list of flag specifications.

```ts
const flags = [
  FlagSpec.value(["--search", "-s"]),
  FlagSpec.value(["--page", "-p"]),
  FlagSpec.bool("--post"),
];

const args = Args.parse(
  ["--search", "enjo", "kouhai", "--page", "2", "--post"],
  flags,
);
```

Access the parsed values:

```ts
args.value("--search"); // "enjo kouhai"
args.value("--page"); // "2"
args.flag("--post"); // true
```

The parser accepts a read-only array of strings. Tokenization is not performed by `Args.parse()`; the caller is responsible for providing the token array.

For example, if an upstream parser produces:

```ts
["--search", "enjo kouhai", "--page", "2"];
```

the parser can use `"enjo kouhai"` as one token, just as it can combine separate tokens such as `"enjo"` and `"kouhai"` into a single value.

## Accessing Parsed Arguments

The `Args` class exposes several methods for retrieving parsed arguments.

### `has(name)`

Checks whether a flag appeared in the input.

```ts
args.has("--search");
args.has("-s");
```

Aliases resolve to the same canonical flag.

Importantly, `has()` checks presence, not whether a value exists.

For example, a value flag supplied without a value still returns `true`.

### `flag(name)`

Returns the boolean state of a boolean flag.

```ts
args.flag("--post");
```

Returns `true` if the boolean flag was supplied, or `false` otherwise.

### `value(name)`

Returns the string value of a value flag.

```ts
const query = args.value("--search");
```

Returns `undefined` if no value was stored.

### `valueParsed(name, parser)`

Converts a string value using a caller-supplied function.

```ts
const page = args.valueParsed("--page", (value) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error("Page must be a non-negative integer");
  }

  return number;
});
```

If the flag has no value or the conversion function throws, `valueParsed()` returns `undefined`.

The method does not automatically report conversion errors to the caller.

### `list(name)`

Returns the values collected by a list flag.

```ts
const tags = args.list("--tags");
```

Returns an empty array if no list values were collected.

### `listStr(name)`

An alias for `list()`.

```ts
const tags = args.listStr("--tags");
```

### `listNonEmpty(name)`

Returns the list if it contains at least one item, or `undefined` otherwise.

```ts
const tags = args.listNonEmpty("--tags");

if (tags) {
  console.log(tags);
}
```

### `json(name)`

Returns a parsed JSON value.

```ts
const data = args.json<{ name: string }>("--data");
```

Returns `undefined` if no successfully parsed JSON value is available.

The generic type parameter is a TypeScript assertion, not runtime validation. Validate the returned value before trusting its structure.

### `jsonParsed(name, parser)`

Passes the parsed JSON value to a caller-supplied conversion or validation function.

```ts
const data = args.jsonParsed("--data", (value) => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string"
  ) {
    throw new Error("Expected an object with a string name");
  }

  return { name: value.name };
});
```

If the JSON value is missing or the supplied function throws, `jsonParsed()` returns `undefined`.

### `jsonError(name)`

Returns the recorded JSON parsing error for a flag, if one exists.

```ts
const error = args.jsonError("--data");

if (error) {
  console.error(error.raw);
  console.error(error.error);
}
```

The returned object contains:

| Property | Description                           |
| -------- | ------------------------------------- |
| `flag`   | Canonical flag name                   |
| `raw`    | Accumulated text that failed to parse |
| `error`  | The original JSON parsing error       |

### Positional Argument Methods

The parser preserves tokens that are not recognized as flags and are not consumed as values.

Use `positional(index)` to retrieve an individual positional argument:

```ts
const first = args.positional(0);
```

Use `rest()` to retrieve all positional arguments:

```ts
const positionals = args.rest();
```

Use `restFrom(index)` to retrieve positional arguments starting at a specified index:

```ts
const remaining = args.restFrom(1);
```

Both `rest()` and `restFrom()` return new arrays.

## Working with JSON

JSON parsing has specific behavior that differs from other flag types.

Consider this input:

```text
--data {"name":"example","count":2} --verbose
```

If `--data` is a JSON flag and `--verbose` is a declared boolean flag, the parser collects the JSON tokens until the JSON becomes valid or another recognized flag is encountered.

The parser does not require JSON values to be supplied as a single token.

However, malformed or incomplete JSON may produce a recorded parsing error.

For example:

```text
--data {"name":
```

In this case, `json("--data")` returns `undefined`, while `jsonError("--data")` provides the latest parsing error.

If JSON validation is important to the command, inspect `jsonError()` or use a validation function with `jsonParsed()`.

## Positional Arguments

Not every token must be a declared flag.

For example, given these specifications:

```ts
const flags = [FlagSpec.value("--search")];
```

and this input:

```text
--search anime extra
```

the parser consumes `"anime extra"` as the value of `--search`, because a value flag collects tokens until it encounters another recognized flag.

By contrast, with this input:

```text
anime extra
```

both tokens remain positional arguments.

```ts
args.positional(0); // "anime"
args.positional(1); // "extra"
args.rest(); // ["anime", "extra"]
```

The parser does not automatically reject unknown tokens. Their interpretation depends on whether a preceding flag consumes them.

## Flag Descriptions

Use `descriptions()` to retrieve the metadata for all declared flags.

```ts
const descriptions = args.descriptions();
```

Each entry contains:

```ts
{
  name: string;
  aliases: string[];
  kind: FlagKind;
  description?: string;
}
```

For example, a specification declared as:

```ts
FlagSpec.value(["--search", "-s"]).description("Search for content");
```

produces an entry equivalent to:

```ts
{
  name: "--search",
  aliases: ["-s"],
  kind: "value",
  description: "Search for content",
}
```

This metadata can be used to implement command help output, documentation generation, or other command introspection features.

Use `getDescription(name)` to retrieve the description associated with a specific flag name.

```ts
args.getDescription("--search");
args.getDescription("-s");
```

Unlike the other lookup methods, the current implementation of `getDescription()` performs a direct lookup in the specification map. Both canonical names and declared aliases are supported.

## Parsing Rules

The following rules define the parser's current behavior.

### Recognized Flags

Only names declared in the supplied `FlagSpec` definitions are treated as flag boundaries.

An undeclared token is not automatically considered a flag merely because it begins with `-`.

For example, if `--search` is declared but `--unknown` is not:

```text
--search anime --unknown value
```

the `--unknown` token is treated as an ordinary token and may be consumed as part of the `--search` value.

This behavior preserves compatibility with the original parser.

### Canonical Names and Aliases

The first name in each `FlagSpec` is the canonical name.

```ts
FlagSpec.value(["--search", "-s"]);
```

Both `--search` and `-s` refer to the same flag. Parsed values are stored under `--search`.

### Value Collection

Value and list flags collect tokens until the next recognized flag or the end of the input.

Unknown tokens do not terminate value collection.

### Repeated Flags

The behavior of repeated flags depends on their type:

| Flag type | Behavior                                                      |
| --------- | ------------------------------------------------------------- |
| Boolean   | Remains enabled                                               |
| Value     | The last supplied non-empty value replaces the previous value |
| List      | Values are appended                                           |
| JSON      | Successfully parsed values replace earlier successful values  |

### Missing Values

The parser does not automatically reject a value flag merely because no value follows it.

For example:

```text
--search
```

The flag is considered present, but its value is `undefined`.

Commands that require a value must validate it themselves.

### Tokenization

`Args.parse()` receives an array of tokens. It does not split raw command text or interpret quotation marks and escape characters.

Tokenization must be handled before invoking the parser.

### Unknown Flags

Unknown tokens remain positional unless a preceding value, list, or JSON flag consumes them.

The parser does not implement strict unknown-flag rejection in its current form.

## Error Handling

The parser can throw errors when the flag specifications themselves are invalid.

Examples include:

- A flag has no names.
- A flag name is empty.
- A flag contains duplicate names.
- Two flag specifications declare the same name.

These are configuration errors and should normally be detected while loading or registering commands.

JSON parsing errors are handled differently. They are stored and can be inspected through `jsonError()`.

Missing values and conversion failures are not automatically raised as parser errors. Commands should validate these cases when necessary.

For example:

```ts
const page = args.valueParsed("--page", (value) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error("Invalid page number");
  }

  return number;
});

if (page === undefined) {
  // Handle a missing or invalid page value.
}
```

## Integration with Commands

In `violajs`, flags can be declared directly in a command definition.

The command dispatcher should parse arguments only after resolving a matching command and only when that command declares flags.

For example:

```ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";

export default defineCommand({
  name: "search",

  flags: [
    FlagSpec.value(["--query", "-q"]).description("Search for content"),

    FlagSpec.value(["--page", "-p"]).description("Page number"),

    FlagSpec.bool("--verbose").description("Enable verbose output"),
  ],

  execute: async (ctx) => {
    const args = ctx.args;

    if (!args) {
      ctx.log.error("Command arguments are unavailable");
      return;
    }

    const query = args.value("--query");
    const page = args.valueParsed("--page", Number);
    const verbose = args.flag("--verbose");

    if (!query) {
      ctx.log.error("A search query is required");
      return;
    }

    // Execute the search operation.
  },
});
```

The dispatcher can prepare the parsed arguments before running middleware and the command handler:

```ts
const command = this.registry.resolve(ctx.name);

if (!command) return;

if (command.flags?.length) {
  ctx.args = Args.parse(ctx.rawArgs, command.flags);
}

await runMiddleware(
  [...this.globalMiddleware, ...(command.middleware ?? [])],
  ctx,
  () => command.execute(ctx),
);
```

This approach avoids parsing flags for unrelated incoming messages and keeps argument parsing out of individual command implementations.

If parsing can fail, the dispatcher should handle configuration or parsing errors appropriately before running middleware or executing the command.

## API Reference

### `FlagSpec`

| Member                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `FlagSpec.bool(names)`  | Defines a boolean flag                     |
| `FlagSpec.value(names)` | Defines a string-value flag                |
| `FlagSpec.list(names)`  | Defines a comma-separated list flag        |
| `FlagSpec.json(names)`  | Defines a JSON flag                        |
| `.description(help)`    | Returns a specification with a description |
| `.getDescription()`     | Returns the flag description               |
| `.name`                 | Returns the canonical flag name            |
| `.names`                | Returns the canonical name and aliases     |
| `.kind`                 | Returns the flag type                      |
| `.help`                 | Returns the optional description           |

### `Args`

| Method                      | Return type                   | Description                                    |
| --------------------------- | ----------------------------- | ---------------------------------------------- |
| `Args.parse(raw, specs)`    | `Args`                        | Parses tokens using flag specifications        |
| `has(name)`                 | `boolean`                     | Checks whether a flag was supplied             |
| `flag(name)`                | `boolean`                     | Checks the state of a boolean flag             |
| `value(name)`               | `string \| undefined`         | Retrieves a string value                       |
| `valueParsed(name, parser)` | `T \| undefined`              | Converts a string value                        |
| `list(name)`                | `string[]`                    | Retrieves a copy of a list                     |
| `listStr(name)`             | `string[]`                    | Alias for `list()`                             |
| `listNonEmpty(name)`        | `string[] \| undefined`       | Retrieves a non-empty list                     |
| `json(name)`                | `T \| undefined`              | Retrieves a parsed JSON value                  |
| `jsonParsed(name, parser)`  | `T \| undefined`              | Validates or converts parsed JSON              |
| `jsonError(name)`           | `JsonParseError \| undefined` | Retrieves a JSON parsing error                 |
| `positional(index)`         | `string \| undefined`         | Retrieves a positional argument                |
| `rest()`                    | `string[]`                    | Retrieves all positional arguments             |
| `restFrom(index)`           | `string[]`                    | Retrieves positional arguments from an index   |
| `descriptions()`            | `Array<FlagDescription>`      | Retrieves metadata for all flag specifications |
| `getDescription(name)`      | `string \| undefined`         | Retrieves a flag description                   |

---

## Notes and Limitations

- The parser does not perform automatic type conversion for ordinary value flags.
- `valueParsed()` and `jsonParsed()` return `undefined` when their conversion functions throw, rather than exposing the thrown errors.
- The parser does not enforce required flags or automatically reject missing values.
- The parser does not implement automatic help output, even though descriptions can be retrieved programmatically.
- The parser does not tokenize raw command strings; callers must provide the token array.
- Unknown tokens are not automatically rejected and may be consumed by preceding value, list, or JSON flags.
- The generic type parameter of `json<T>()` does not validate the runtime JSON structure.

These behaviors are intentional parts of the current API. Additional validation, automatic help generation, or stricter parsing modes can be introduced separately without changing the core responsibilities of `FlagSpec` and `Args`.
