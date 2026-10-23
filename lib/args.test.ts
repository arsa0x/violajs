import { describe, expect, test } from "bun:test";
import { Args, FlagSpec } from "./args";

const specs = [
  FlagSpec.bool(["-v", "--verbose"]),
  FlagSpec.value(["-r", "--reason"]),
  FlagSpec.list(["-t", "--tag"]),
  FlagSpec.json(["-c", "--config"]),
];

describe("Args", () => {
  test("recognizes aliases and canonicalizes lookups", () => {
    const args = Args.parse(["-v", "--reason", "maintenance"], specs);

    expect(args.flag("--verbose")).toBe(true);
    expect(args.flag("-v")).toBe(true);
    expect(args.has("-r")).toBe(true);
    expect(args.value("--reason")).toBe("maintenance");
    expect(args.value("-r")).toBe("maintenance");
  });

  test("distinguishes a missing value from a missing flag", () => {
    const args = Args.parse(["--reason", "--verbose"], specs);

    expect(args.has("--reason")).toBe(true);
    expect(args.value("--reason")).toBeUndefined();
    expect(args.has("--tag")).toBe(false);
  });

  test("collects value tokens until the next declared flag", () => {
    const args = Args.parse(["@user", "--reason", "repeat", "spam", "--verbose"], specs);

    expect(args.positional(0)).toBe("@user");
    expect(args.value("--reason")).toBe("repeat spam");
    expect(args.flag("--verbose")).toBe(true);
    expect(args.rest()).toEqual(["@user"]);
  });

  test("splits list values by commas and appends repeated list flags", () => {
    const args = Args.parse(
      ["--tag", "one, two", "-t", "three,,", "four", "--verbose"],
      specs,
    );

    expect(args.list("--tag")).toEqual(["one", "two", "three", "four"]);
    expect(args.listNonEmpty("--tag")).toEqual(["one", "two", "three", "four"]);
    expect(args.list("--reason")).toEqual([]);
  });

  test("parses JSON and exposes invalid JSON errors", () => {
    const valid = Args.parse(["--config", '{"limit":3,"enabled":true}', "after-json", "--verbose"], specs);
    expect(valid.json<{ limit: number; enabled: boolean }>("--config")).toEqual({
      limit: 3,
      enabled: true,
    });
    expect(valid.positional(0)).toBe("after-json");
    expect(valid.jsonParsed("--config", (value) => {
      if (typeof value !== "object" || value === null || !("limit" in value)) {
        throw new TypeError("Expected config object");
      }
      return Number(value.limit);
    })).toBe(3);

    const invalid = Args.parse(["--config", "{broken"], specs);
    expect(invalid.json("--config")).toBeUndefined();
    expect(invalid.jsonError("--config")?.raw).toBe("{broken");
  });

  test("parses primitive values and positional rest", () => {
    const args = Args.parse(["first", "second", "--reason", "hello"], specs);

    expect(args.valueParsed("--reason", (raw) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) throw new TypeError("Expected a number");
      return parsed;
    })).toBeUndefined();
    expect(args.positional(1)).toBe("second");
    expect(args.restFrom(1)).toEqual(["second"]);
  });

  test("rejects duplicate flag names", () => {
    expect(() => Args.parse([], [
      FlagSpec.bool(["-v", "--verbose"]),
      FlagSpec.value(["--verbose", "-r"]),
    ])).toThrow(/declared more than once/);
  });
});
