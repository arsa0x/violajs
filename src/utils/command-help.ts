import type { Command } from "../types/command";
import type { FlagSpec } from "@lib/args";

const HELP_NAMES = ["-h", "--help"] as const;

function formatFlag(flag: FlagSpec): string {
  const names = [...flag.names].join(", ");

  const argument =
    flag.kind === "bool"
      ? ""
      : flag.kind === "json"
        ? " <json>"
        : flag.kind === "list"
          ? " <item,...>"
          : " <value>";

  const description = flag.getDescription();

  return [`  ${names}${argument}`, description ? ` — ${description}` : ""].join(
    "",
  );
}

export function generateCommandHelp(command: Command): string {
  const lines = [
    `*Command: ${command.name}*`,
    "",
    `*Description:* ${command.description ?? "No description provided."}`,
    `*Aliases:* ${
      command.aliases?.length ? command.aliases.join(", ") : "None"
    }`,
    `*Category:* ${command.category ?? "Uncategorized"}`,
    "",
    "*Flags:*",
    `  ${HELP_NAMES.join(", ")} — Show this help message.`,
  ];

  for (const flag of command.flags ?? []) {
    lines.push(formatFlag(flag));
  }

  return lines.join("\n");
}
