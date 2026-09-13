import { readdir } from "fs/promises";
import { join, extname } from "path";
import { pathToFileURL } from "url";
import { CommandRegistry } from "./registry";
import type { Command } from "../types/command";

export async function loadCommands(registry: CommandRegistry): Promise<void> {
  const files = await collectCommandFiles("commands");

  for (const file of files) {
    const module = await import(pathToFileURL(file).href);
    const command = module.default as Command | undefined;

    if (!command || typeof command.execute !== "function" || !command.name) {
      throw new Error(`Invalid command module: ${file}`);
    }

    registry.register(command);
  }
}

async function collectCommandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectCommandFiles(path)));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".ts") {
      files.push(path);
    }
  }

  return files.sort();
}
