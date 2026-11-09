import { CommandRegistry } from "@core/registry";
import { DynamicLoader } from "@core/dynamicLoader";
import { startApp } from "src/app";
import { log } from "@lib/logger";

const registry = new CommandRegistry();
const loader = new DynamicLoader(registry);

async function bootstrap() {
  try {
    await loader.load();
    await loader.watch();
    await startApp(registry);
  } catch (error) {
    loader.stop();
    log.error("Startup failed:", error);
    process.exitCode = 1;
  }
}

await bootstrap();
