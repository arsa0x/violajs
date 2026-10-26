import type { Command } from "../types/command";

export class CommandRegistry {
  private readonly lookup = new Map<string, Command>();
  private readonly canonical = new Map<string, Command>();

  register(command: Command): void {
    const name = command.name.trim().toLowerCase();
    if (!name) throw new Error("Command name cannot be empty");

    const reservedFlags = new Set(["--help", "-h"]);

    for (const flag of command.flags ?? []) {
      for (const flagName of flag.names) {
        if (reservedFlags.has(flagName)) {
          throw new Error(
            `Flag "${flagName}" is reserved for built-in command help.`,
          );
        }
      }
    }

    this.assertAvailable(name);
    this.lookup.set(name, command);
    this.canonical.set(name, command);

    for (const alias of command.aliases ?? []) {
      const key = alias.trim().toLowerCase();
      if (!key) continue;
      this.assertAvailable(key);
      this.lookup.set(key, command);
    }
  }

  resolve(name: string): Command | undefined {
    return this.lookup.get(name.trim().toLowerCase());
  }

  list(): Command[] {
    return [...this.canonical.values()];
  }

  private assertAvailable(key: string): void {
    if (this.lookup.has(key)) {
      throw new Error(`Command or alias already registered: ${key}`);
    }
  }
}
