import { readdir } from "fs/promises";
import { readFile } from "fs/promises";
import { watch, type FSWatcher } from "fs";
import { join, extname, resolve, relative } from "path";
import { CommandRegistry } from "./registry";
import type { Command } from "@src/types/command";
import { log } from "@lib/logger";

const COMMANDS_DIR = resolve("commands");
const EXTENSIONS = new Set([".ts", ".js"]);
const DEBOUNCE_MS = 150;

export class DynamicLoader {
  private watcher?: FSWatcher;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private fileCommands = new Map<string, string>();

  constructor(private readonly registry: CommandRegistry) {}

  async load(): Promise<void> {
    const files = await this.collectFiles(COMMANDS_DIR);

    for (const file of files) {
      await this.loadFile(file);
    }
  }

  async watch(): Promise<void> {
    if (this.watcher) return;

    this.watcher = watch(
      COMMANDS_DIR,
      { recursive: true },
      (event, filename) => {
        if (!filename) return;

        const file = resolve(COMMANDS_DIR, filename.toString());

        if (!EXTENSIONS.has(extname(file))) return;

        this.debounce(file);
      },
    );

    this.watcher.on("error", (error) => {
      log.error("Watcher error:", error);
    });

    log.info("Watching for changes...");
  }

  private debounce(file: string): void {
    const existing = this.timers.get(file);

    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.timers.delete(file);
      await this.handleChange(file);
    }, DEBOUNCE_MS);

    this.timers.set(file, timer);
  }

  private async handleChange(file: string): Promise<void> {
    const filename = relative(COMMANDS_DIR, file);

    try {
      const files = await this.collectFiles(COMMANDS_DIR);

      if (!files.includes(file)) {
        const commandName = this.fileCommands.get(file);

        if (commandName) {
          this.registry.unregister(commandName);
          this.fileCommands.delete(file);

          log.info("Deleted:", filename);
        }

        return;
      }

      await this.loadFile(file);

      log.info("Reloaded:", filename);
    } catch (error) {
      log.error("Failed to reload", filename, error);
    }
  }

  private async loadFile(file: string): Promise<void> {
    const source = await readFile(file, "utf-8");

    const transpiler = new Bun.Transpiler({
      loader: extname(file).slice(1) as "ts" | "js",
      target: "bun",
    });

    const compiled = transpiler.transformSync(source);

    const moduleUrl = `data:text/javascript;base64,${Buffer.from(
      compiled,
    ).toString("base64")}`;

    const module = await import(moduleUrl);
    const command = module.default as Command | undefined;

    if (
      !command ||
      typeof command.execute !== "function" ||
      !command.name?.trim()
    ) {
      throw new Error(`Invalid command module: ${file}`);
    }

    const previousName = this.fileCommands.get(file);

    this.registry.replace(command, previousName);

    this.fileCommands.set(file, command.name.trim().toLowerCase());

    log.info("Loaded:", command.name);
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, {
      withFileTypes: true,
    });

    const files = await Promise.all(
      entries.map(async (entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
          return this.collectFiles(path);
        }

        if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
          return [path];
        }

        return [];
      }),
    );

    return files.flat().sort();
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = undefined;

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();

    log.info("Watcher stopped.");
  }
}
