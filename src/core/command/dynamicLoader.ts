import { pathToFileURL } from "node:url";
import { readdir } from "fs/promises";
import { readFile } from "fs/promises";
import { watch, type FSWatcher } from "fs";
import { join, extname, resolve, relative } from "path";
import { CommandRegistry } from "./registry";
import type { CommandPlugin } from "@src/types/command";
import { log } from "@lib/logger";

const COMMANDS_DIR = resolve("plugins", "commands");
const EXTENSIONS = new Set([".ts", ".js"]);
const DEBOUNCE_MS = 150;

export class DynamicLoader {
  private watcher?: FSWatcher;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private fileCommands = new Map<string, string>();
  private queues = new Map<string, Promise<void>>();
  private seq = 0;

  constructor(private readonly registry: CommandRegistry) {}

  private enqueue(file: string, task: () => Promise<void>): Promise<void> {
    const next = (this.queues.get(file) ?? Promise.resolve())
      .then(task)
      .catch((error) => {
        log.error("Reload failed:", relative(COMMANDS_DIR, file), error);
      });
    this.queues.set(file, next);
    next.finally(() => {
      if (this.queues.get(file) === next) this.queues.delete(file);
    });
    return next;
  }

  async load(): Promise<void> {
    for (const file of await this.collectFiles(COMMANDS_DIR)) {
      await this.enqueue(file, () => this.reconcile(file));
    }
  }

  private async reconcile(file: string): Promise<void> {
    const name = relative(COMMANDS_DIR, file);

    if (!(await Bun.file(file).exists())) {
      const prevName = this.fileCommands.get(file);
      if (!prevName) return;
      const prev = this.registry.resolve(prevName);
      this.registry.unregister(prevName);
      this.fileCommands.delete(file);
      await this.disposeQuietly(prev);
      log.info("Deleted:", name);
      return;
    }

    const { mtimeMs } = await Bun.file(file).stat();
    const mod = await import(
      `${pathToFileURL(file).href}?v=${mtimeMs}.${++this.seq}`
    );
    const command = mod.default as CommandPlugin | undefined;
    if (
      !command ||
      typeof command.execute !== "function" ||
      !command.name?.trim()
    ) {
      throw new Error(`Invalid command module: ${file}`);
    }

    const prevName = this.fileCommands.get(file);
    const prev = prevName ? this.registry.resolve(prevName) : undefined;
    this.registry.replace(command, prevName);
    this.fileCommands.set(file, command.name.trim().toLowerCase());
    await this.disposeQuietly(prev);
    log.info("Loaded:", command.name);
  }

  private async disposeQuietly(cmd?: CommandPlugin): Promise<void> {
    try {
      await cmd?.dispose?.();
    } catch (e) {
      log.warn("dispose() failed:", e);
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

    log.info("Watching command plugins for changes...");
  }

  private debounce(file: string): void {
    clearTimeout(this.timers.get(file));
    this.timers.set(
      file,
      setTimeout(() => {
        this.timers.delete(file);
        void this.enqueue(file, () => this.reconcile(file));
      }, DEBOUNCE_MS),
    );
  }

  // private async handleChange(file: string): Promise<void> {
  //   const filename = relative(COMMANDS_DIR, file);

  //   try {
  //     const files = await this.collectFiles(COMMANDS_DIR);

  //     if (!files.includes(file)) {
  //       const commandName = this.fileCommands.get(file);

  //       if (commandName) {
  //         this.registry.unregister(commandName);
  //         this.fileCommands.delete(file);

  //         log.info("Deleted:", filename);
  //       }

  //       return;
  //     }

  //     await this.loadFile(file);

  //     log.info("Reloaded:", filename);
  //   } catch (error) {
  //     log.error("Failed to reload", filename, error);
  //   }
  // }

  // private async loadFile(file: string): Promise<void> {
  //   const source = await readFile(file, "utf-8");

  //   const transpiler = new Bun.Transpiler({
  //     loader: extname(file).slice(1) as "ts" | "js",
  //     target: "bun",
  //   });

  //   const compiled = transpiler.transformSync(source);

  //   const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  //     compiled,
  //   ).toString("base64")}`;

  //   const module = await import(moduleUrl);
  //   const command = module.default as CommandPlugin | undefined;

  //   if (
  //     !command ||
  //     typeof command.execute !== "function" ||
  //     !command.name?.trim()
  //   ) {
  //     throw new Error(`Invalid command module: ${file}`);
  //   }

  //   const previousName = this.fileCommands.get(file);

  //   this.registry.replace(command, previousName);

  //   this.fileCommands.set(file, command.name.trim().toLowerCase());

  //   log.info("Loaded:", command.name);
  // }

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
