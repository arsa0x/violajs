/**
 * Declarative argument parser inspired by Viola's Rust args.rs.
 *
 * Only flags declared in the supplied specs are treated as flag boundaries.
 * Unknown tokens remain positional (unless they are consumed as a value by a
 * preceding value/list/json flag), matching the original parser's behavior.
 */

export type FlagKind = "bool" | "value" | "list" | "json";

export class FlagSpec {
  readonly names: readonly string[];
  readonly kind: FlagKind;
  readonly help?: string;

  private constructor(names: readonly string[], kind: FlagKind, help?: string) {
    if (names.length === 0) {
      throw new TypeError("A flag must have at least one name.");
    }

    const normalized = names.map((name) => name.trim());
    if (normalized.some((name) => !name)) {
      throw new TypeError("Flag names cannot be empty.");
    }
    if (new Set(normalized).size !== normalized.length) {
      throw new TypeError("Flag names must be unique within a flag.");
    }

    this.names = normalized;
    this.kind = kind;
    this.help = help;
  }

  static bool(names: string | readonly string[]): FlagSpec {
    return new FlagSpec(toNames(names), "bool");
  }

  static value(names: string | readonly string[]): FlagSpec {
    return new FlagSpec(toNames(names), "value");
  }

  static list(names: string | readonly string[]): FlagSpec {
    return new FlagSpec(toNames(names), "list");
  }

  static json(names: string | readonly string[]): FlagSpec {
    return new FlagSpec(toNames(names), "json");
  }

  description(help: string): FlagSpec {
    return new FlagSpec(this.names, this.kind, help);
  }

  getDescription(): string | undefined {
    return this.help;
  }

  /** First name is the canonical name; remaining names are aliases. */
  get name(): string {
    return this.names[0]!;
  }
}

function toNames(names: string | readonly string[]): readonly string[] {
  return typeof names === "string" ? [names] : names;
}

export interface JsonParseError {
  flag: string;
  raw: string;
  error: unknown;
}

export class Args {
  private readonly flags = new Map<string, boolean>();
  private readonly values = new Map<string, string>();
  private readonly lists = new Map<string, string[]>();
  private readonly jsonValues = new Map<string, unknown>();
  private readonly jsonErrors = new Map<string, JsonParseError>();
  private readonly positionals: string[] = [];
  private readonly present = new Set<string>();
  private readonly specByName = new Map<string, FlagSpec>();
  private readonly specs: readonly FlagSpec[];

  private constructor(specs: readonly FlagSpec[]) {
    this.specs = specs;

    for (const spec of specs) {
      for (const name of spec.names) {
        if (this.specByName.has(name)) {
          throw new TypeError(
            `Flag name "${name}" is declared more than once.`,
          );
        }
        this.specByName.set(name, spec);
      }
    }
  }

  static parse(raw: readonly string[], specs: readonly FlagSpec[]): Args {
    const result = new Args(specs);
    let index = 0;

    while (index < raw.length) {
      const token = raw[index]!;
      const spec = result.specByName.get(token);

      if (!spec) {
        result.positionals.push(token);
        index += 1;
        continue;
      }

      const name = spec.name;
      result.present.add(name);
      index += 1;

      if (spec.kind === "bool") {
        result.flags.set(name, true);
        continue;
      }

      const collected: string[] = [];

      if (spec.kind === "json") {
        let parsed = false;

        // JSON may arrive as multiple tokens; stop at the first valid value.
        while (index < raw.length && !result.specByName.has(raw[index]!)) {
          collected.push(raw[index]!);
          index += 1;

          const rawJson = collected.join(" ");
          try {
            result.jsonValues.set(name, JSON.parse(rawJson) as unknown);
            result.jsonErrors.delete(name);
            parsed = true;
            break;
          } catch (error) {
            result.jsonErrors.set(name, { flag: name, raw: rawJson, error });
          }
        }

        if (!parsed && collected.length === 0) {
          result.jsonErrors.delete(name);
        }
        continue;
      }

      while (index < raw.length && !result.specByName.has(raw[index]!)) {
        collected.push(raw[index]!);
        index += 1;
      }

      if (spec.kind === "value") {
        if (collected.length > 0) {
          // Repeated value flags use the last supplied value.
          result.values.set(name, collected.join(" "));
        }
        continue;
      }

      if (spec.kind === "list") {
        const current = result.lists.get(name) ?? [];
        for (const item of collected.join(" ").split(",")) {
          const trimmed = item.trim();
          if (trimmed) current.push(trimmed);
        }
        result.lists.set(name, current);
      }
    }

    return result;
  }

  /** True when a boolean flag was supplied. */
  flag(name: string): boolean {
    return this.flags.get(this.canonical(name)) ?? false;
  }

  /** True when the flag appeared, even if its value was omitted. */
  has(name: string): boolean {
    return this.present.has(this.canonical(name));
  }

  /** Returns the flag's string value, or undefined if no value was supplied. */
  value(name: string): string | undefined {
    return this.values.get(this.canonical(name));
  }

  /** Parses a value using a caller-supplied conversion function. */
  valueParsed<T>(name: string, parser: (raw: string) => T): T | undefined {
    const raw = this.value(name);
    if (raw === undefined) return undefined;

    try {
      return parser(raw);
    } catch {
      return undefined;
    }
  }

  /** Returns a copy of the list value so callers cannot mutate parser state. */
  list(name: string): string[] {
    return [...(this.lists.get(this.canonical(name)) ?? [])];
  }

  listStr(name: string): string[] {
    return this.list(name);
  }

  listNonEmpty(name: string): string[] | undefined {
    const items = this.list(name);
    return items.length > 0 ? items : undefined;
  }

  /** Returns parsed JSON, or undefined if missing/invalid. */
  json<T = unknown>(name: string): T | undefined {
    return this.jsonValues.get(this.canonical(name)) as T | undefined;
  }

  /** Parses JSON and then validates/converts it with a caller-supplied parser. */
  jsonParsed<T>(name: string, parser: (value: unknown) => T): T | undefined {
    const value = this.json(name);
    if (value === undefined) return undefined;

    try {
      return parser(value);
    } catch {
      return undefined;
    }
  }

  jsonError(name: string): JsonParseError | undefined {
    return this.jsonErrors.get(this.canonical(name));
  }

  positional(index: number): string | undefined {
    return this.positionals[index];
  }

  rest(): string[] {
    return [...this.positionals];
  }

  restFrom(index: number): string[] {
    return this.positionals.slice(index);
  }

  descriptions(): Array<{
    name: string;
    aliases: string[];
    kind: FlagKind;
    description?: string;
  }> {
    return this.specs.map((spec) => ({
      name: spec.name,
      aliases: spec.names.slice(1),
      kind: spec.kind,
      ...(spec.help === undefined ? {} : { description: spec.help }),
    }));
  }

  getDescription(name: string): string | undefined {
    return this.specByName.get(name)?.getDescription();
  }

  private canonical(name: string): string {
    return this.specByName.get(name)?.name ?? name;
  }
}
