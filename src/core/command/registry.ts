import type { Command } from "@src/types/command";

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

  unregister(name: string): boolean {
    const key = name.trim().toLowerCase();
    const command = this.canonical.get(key);

    if (!command) return false;

    this.removeCommand(command);
    return true;
  }

  replace(command: Command, previousName?: string): void {
    const name = command.name.trim().toLowerCase();

    if (!name) {
      throw new Error("Command name cannot be empty");
    }

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

    const aliases = (command.aliases ?? [])
      .map((alias) => alias.trim().toLowerCase())
      .filter(Boolean);

    const keys = [name, ...aliases];

    if (new Set(keys).size !== keys.length) {
      throw new Error(`Duplicate command name or alias: ${name}`);
    }

    const previous = previousName
      ? this.canonical.get(previousName.trim().toLowerCase())
      : this.canonical.get(name);

    for (const key of keys) {
      const existing = this.lookup.get(key);

      if (existing && existing !== previous) {
        throw new Error(`Command or alias already registered: ${key}`);
      }
    }

    if (previous) {
      this.removeCommand(previous);
    }

    this.canonical.set(name, command);

    for (const key of keys) {
      this.lookup.set(key, command);
    }
  }

  private removeCommand(command: Command): void {
    const name = command.name.trim().toLowerCase();

    this.canonical.delete(name);

    for (const [key, value] of this.lookup) {
      if (value === command) {
        this.lookup.delete(key);
      }
    }
  }
}
