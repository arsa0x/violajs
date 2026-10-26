import { describe, expect, test } from "bun:test";
import { FlagSpec } from "@lib/args";
import { generateCommandHelp } from "../src/utils/command-help";
import type { Command } from "../src/types/command";

describe("generateCommandHelp", () => {
  test("includes command metadata and declared flags", () => {
    const command = {
      name: "nekopoi",
      aliases: ["nk"],
      description: "Search anime content.",
      category: "search",
      flags: [
        FlagSpec.value(["--search", "-s"]).description(
          "Search using a keyword.",
        ),
        FlagSpec.bool("--post").description("Retrieve a post."),
      ],
      execute: async () => {},
    } satisfies Command;

    const help = generateCommandHelp(command);

    expect(help).toContain("*Command: nekopoi*");
    expect(help).toContain("*Description:* Search anime content.");
    expect(help).toContain("*Aliases:* nk");
    expect(help).toContain("*Category:* search");
    expect(help).toContain("-h, --help");
    expect(help).toContain("--search, -s <value>");
    expect(help).toContain("Search using a keyword.");
    expect(help).toContain("--post");
    expect(help).toContain("Retrieve a post.");
  });

  test("handles commands without optional metadata", () => {
    const command = {
      name: "ping",
      execute: async () => {},
    } satisfies Command;

    const help = generateCommandHelp(command);

    expect(help).toContain("*Command: ping*");
    expect(help).toContain("No description provided.");
    expect(help).toContain("*Aliases:* None");
    expect(help).toContain("*Category:* Uncategorized");
    expect(help).toContain("*Flags:*");
  });
});
