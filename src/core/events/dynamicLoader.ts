import { readdir, readFile } from "fs/promises";
import { watch, type FSWatcher } from "fs";
import { extname, join, relative, resolve } from "node:path";
import type { EventPlugin } from "@src/types/event";
import { EventRegistry } from "./registry";
import { log } from "@lib/logger";

const EVENTS_DIR = resolve("events");
const EXTENSIONS = new Set([".ts", ".js"]);
const DEBOUNCE_MS = 150;

export class EventDynamicLoader {
  private watcher?: FSWatcher;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private filePlugins = new Map<string, string>();

  constructor(private readonly registry: EventRegistry) {}

  async load(): Promise<void> {
    for (const file of await this.collectFiles(EVENTS_DIR)) {
      await this.loadFile(file);
    }
  }

  async watch(): Promise<void> {
    if (this.watcher) return;

    this.watcher = watch(
      EVENTS_DIR,
      { recursive: true },
      (_event, filename) => {
        if (!filename) return;
        const file = resolve(EVENTS_DIR, filename.toString());
        if (EXTENSIONS.has(extname(file))) this.debounce(file);
      },
    );

    this.watcher.on("error", (error) => {
      log.error("Event watcher error:", error);
    });

    log.info("Watching event plugins for changes...");
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
    const filename = relative(EVENTS_DIR, file);

    try {
      const files = await this.collectFiles(EVENTS_DIR);
      if (!files.includes(file)) {
        const pluginName = this.filePlugins.get(file);
        if (pluginName) {
          this.registry.unregister(pluginName);
          this.filePlugins.delete(file);
          log.info("Deleted event plugin:", filename);
        }
        return;
      }

      await this.loadFile(file);
      log.info("Reloaded event plugin:", filename);
    } catch (error) {
      log.error("Failed to reload event plugin", filename, error);
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
    const plugin = module.default as EventPlugin | undefined;

    if (
      !plugin ||
      !plugin.name?.trim() ||
      !plugin.events ||
      typeof plugin.events !== "object"
    ) {
      throw new Error(`Invalid event plugin module: ${file}`);
    }

    const previousName = this.filePlugins.get(file);
    this.registry.replace(plugin, previousName);
    this.filePlugins.set(file, plugin.name.trim());
    log.info("Loaded event plugin:", plugin.name);
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return this.collectFiles(path);
        if (entry.isFile() && EXTENSIONS.has(extname(entry.name)))
          return [path];
        return [];
      }),
    );
    return files.flat().sort();
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = undefined;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    log.info("Event plugin watcher stopped.");
  }
}
