import { CommandRegistry } from "@core/registry";
import { DynamicLoader } from "@core/dynamicLoader";
import { EventRegistry } from "@core/events/registry";
import { EventDynamicLoader } from "@core/events/dynamicLoader";
import { startApp } from "src/app";
import { log } from "@lib/logger";

const registry = new CommandRegistry();
const eventRegistry = new EventRegistry();
const loader = new DynamicLoader(registry);
const eventLoader = new EventDynamicLoader(eventRegistry);

async function bootstrap() {
  try {
    await loader.load();
    await eventLoader.load();
    await loader.watch();
    await eventLoader.watch();
    await startApp(registry, eventRegistry);
  } catch (error) {
    loader.stop();
    eventLoader.stop();
    log.error("Startup failed:", error);
    process.exitCode = 1;
  }
}

await bootstrap();
