import { CommandRegistry } from "@core/registry";
import { loadStaticCommands } from "@core/staticLoader";
import { startApp } from "src/app";

const registry = new CommandRegistry();

loadStaticCommands(registry);
await startApp(registry);
