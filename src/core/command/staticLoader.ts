import type { CommandRegistry } from "./registry";
import { commands } from "@src/generated/commands";

export function loadStaticCommands(registry: CommandRegistry): void {
  for (const cmd of commands) {
    registry.register(cmd);
  }
}
