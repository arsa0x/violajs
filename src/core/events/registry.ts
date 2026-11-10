import type { EventContext } from "@core/context";
import type { EventMap, EventName, EventPlugin } from "@src/types/event";

type HandlerRecord = {
  pluginName: string;
  handler: (ctx: EventContext<unknown>) => Promise<void>;
};

export class EventRegistry {
  private readonly handlers = new Map<EventName, HandlerRecord[]>();
  private readonly plugins = new Map<string, EventPlugin>();

  register(plugin: EventPlugin): void {
    this.validate(plugin);

    const name = plugin.name.trim();
    if (this.plugins.has(name)) {
      throw new Error(`Event plugin already registered: ${name}`);
    }

    this.add(plugin, name);
  }

  replace(plugin: EventPlugin, previousName?: string): void {
    this.validate(plugin);

    const name = plugin.name.trim();
    const previous = previousName?.trim() || name;
    const existing = this.plugins.get(name);

    if (existing && name !== previous) {
      throw new Error(`Event plugin already registered: ${name}`);
    }

    this.remove(previous);
    this.add(plugin, name);
  }

  unregister(name: string): boolean {
    return this.remove(name.trim());
  }

  get<K extends EventName>(
    name: K,
  ): Array<{
    pluginName: string;
    handler: (ctx: EventContext<EventMap[K]>) => Promise<void>;
  }> {
    return (this.handlers.get(name) ?? []) as Array<{
      pluginName: string;
      handler: (ctx: EventContext<EventMap[K]>) => Promise<void>;
    }>;
  }

  list(): EventPlugin[] {
    return [...this.plugins.values()];
  }

  private validate(plugin: EventPlugin): void {
    const name = plugin.name?.trim();
    if (!name) throw new Error("Event plugin name cannot be empty");
    if (!plugin.events || typeof plugin.events !== "object") {
      throw new Error(`Event plugin "${name}" must define an events object`);
    }

    for (const [eventName, handler] of Object.entries(plugin.events)) {
      if (typeof handler !== "function") {
        throw new Error(
          `Invalid handler for event "${eventName}" in plugin "${name}"`,
        );
      }
    }
  }

  private add(plugin: EventPlugin, name: string): void {
    this.plugins.set(name, plugin);

    for (const [eventName, handler] of Object.entries(plugin.events)) {
      const key = eventName as EventName;
      const records = this.handlers.get(key) ?? [];
      records.push({
        pluginName: name,
        handler: handler as HandlerRecord["handler"],
      });
      this.handlers.set(key, records);
    }
  }

  private remove(name: string): boolean {
    if (!this.plugins.has(name)) return false;

    this.plugins.delete(name);

    for (const [eventName, records] of this.handlers) {
      const remaining = records.filter((record) => record.pluginName !== name);
      if (remaining.length) this.handlers.set(eventName, remaining);
      else this.handlers.delete(eventName);
    }

    return true;
  }
}
