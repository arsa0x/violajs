import type { WASocket } from "baileys";
import type { Log } from "@lib/logger";
import type { EventMap, EventName } from "../../types/event";
import { EventRegistry } from "./registry";
import { EventContext } from "@core/context";

export class EventDispatcher {
  constructor(
    private readonly registry: EventRegistry,
    private readonly sock: WASocket,
    private readonly log: Log,
  ) {}

  async dispatch<K extends EventName>(
    name: K,
    event: EventMap[K],
  ): Promise<void> {
    const handlers = this.registry.get(name);

    await Promise.all(
      handlers.map(async ({ pluginName, handler }) => {
        const eventCtx = new EventContext({
          sock: this.sock,
          log: this.log,
          pluginName,
          event,
        });

        try {
          await handler(eventCtx);
        } catch (error) {
          this.log.error(
            `Event handler failed: ${pluginName} (${String(name)})`,
            error,
          );
        }
      }),
    );
  }
}
