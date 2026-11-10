import type { EventRegistry } from "./registry";
import { events } from "@src/generated/events";

export function loadStaticEvents(registry: EventRegistry): void {
  for (const plugin of events) {
    registry.register(plugin);
  }
}
