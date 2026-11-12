import type { CommandPlugin } from "@src/types/command";

export function defineCommand(command: CommandPlugin): CommandPlugin {
  return command;
}
