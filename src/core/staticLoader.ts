import type { CommandRegistry } from "./registry";
import { commands } from "../generated/commands";

export function loadStaticCommands(registry: CommandRegistry): void {
  for (const cmd of commands) {
    registry.register(cmd);
  }
}
