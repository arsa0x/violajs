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

    expect(help).toContain(
      "*Description:* Search anime content.\n*Aliases:* nk\n*Category:* search\n\n*Flags:*\n  ```-h```, ```--help```\n> Show this help message.\n\n  ```--search```, ```-s``` <value>\n> Search using a keyword.\n\n  ```--post```\n> Retrieve a post.",
    );
  });

  test("handles commands without optional metadata", () => {
    const command = {
      name: "ping",
      execute: async () => {},
    } satisfies Command;

    const help = generateCommandHelp(command);

    expect(help).toContain(
      "*Description:* -\n*Aliases:* None\n*Category:* -\n\n*Flags:*\n  ```-h```, ```--help```\n> Show this help message.",
    );
  });
});
