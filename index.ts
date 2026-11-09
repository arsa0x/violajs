import { CommandRegistry } from "@core/registry";
import { startApp } from "src/app";
import { loadStaticCommands } from "@core/staticLoader";
import { EventRegistry } from "@core/events/registry";
import { loadStaticEvents } from "@core/events/staticLoader";

const registry = new CommandRegistry();
const eventRegistry = new EventRegistry();

loadStaticCommands(registry);
loadStaticEvents(eventRegistry);
await startApp(registry, eventRegistry);
