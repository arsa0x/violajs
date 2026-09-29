import { CommandRegistry } from "@core/registry";
import { loadCommands } from "@core/loader";
import { startApp } from "src/app";

const registry = new CommandRegistry();

await loadCommands(registry);
await startApp(registry);
