import { describe, expect, test } from "bun:test";
import type { WASocket } from "baileys";
import type { Log } from "@lib/logger";
import { defineEvent } from "../src/core/event";
import { EventDispatcher } from "../src/core/events/dispatcher";
import { EventRegistry } from "../src/core/events/registry";

describe("EventRegistry", () => {
  test("registers multiple plugins for the same event", () => {
    const registry = new EventRegistry();

    registry.register(
      defineEvent({
        name: "logger",
        events: { "message.received": async () => {} },
      }),
    );
    registry.register(
      defineEvent({
        name: "auto-reply",
        events: { "message.received": async () => {} },
      }),
    );

    expect(registry.get("message.received")).toHaveLength(2);
    expect(registry.list().map((plugin) => plugin.name)).toEqual([
      "logger",
      "auto-reply",
    ]);
  });

  test("rejects duplicate plugin names", () => {
    const registry = new EventRegistry();
    const plugin = defineEvent({
      name: "logger",
      events: { "message.received": async () => {} },
    });

    registry.register(plugin);
    expect(() => registry.register(plugin)).toThrow(
      "Event plugin already registered: logger",
    );
  });

  test("unregisters every handler owned by a plugin", () => {
    const registry = new EventRegistry();
    registry.register(
      defineEvent({
        name: "multi-event",
        events: {
          "message.received": async () => {},
          "connection.open": async () => {},
        },
      }),
    );

    expect(registry.unregister("multi-event")).toBe(true);
    expect(registry.get("message.received")).toHaveLength(0);
    expect(registry.get("connection.open")).toHaveLength(0);
    expect(registry.unregister("multi-event")).toBe(false);
  });

  test("replaces a plugin without retaining its previous handlers", () => {
    const registry = new EventRegistry();
    registry.register(
      defineEvent({
        name: "old-name",
        events: { "message.received": async () => {} },
      }),
    );

    registry.replace(
      defineEvent({
        name: "new-name",
        events: { "connection.open": async () => {} },
      }),
      "old-name",
    );

    expect(registry.get("message.received")).toHaveLength(0);
    expect(registry.get("connection.open")).toHaveLength(1);
    expect(registry.list().map((plugin) => plugin.name)).toEqual(["new-name"]);
  });
});

describe("EventDispatcher", () => {
  test("runs handlers in parallel and isolates handler failures", async () => {
    const registry = new EventRegistry();
    const started: string[] = [];
    const logs: unknown[][] = [];
    let releaseSecond!: () => void;
    const secondStarted = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });

    registry.register(
      defineEvent({
        name: "first",
        events: {
          "message.received": async () => {
            started.push("first");
            await secondStarted;
            throw new Error("first failed");
          },
        },
      }),
    );
    registry.register(
      defineEvent({
        name: "second",
        events: {
          "message.received": async () => {
            started.push("second");
            releaseSecond();
          },
        },
      }),
    );

    const log = {
      error: (...args: unknown[]) => logs.push(args),
    } as unknown as Log;

    const dispatcher = new EventDispatcher(registry, {} as WASocket, log);

    await dispatcher.dispatch("message.received", {
      message: {} as never,
      text: "hello",
      chat: { jid: "chat@s.whatsapp.net", isGroup: false },
      sender: { jid: "sender@s.whatsapp.net" },
    });

    expect(started).toHaveLength(2);
    expect(started).toContain("first");
    expect(started).toContain("second");
    expect(logs).toHaveLength(1);
    expect(logs[0]?.[0]).toContain("first");
  });
});
