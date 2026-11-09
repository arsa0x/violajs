import { CommandRegistry } from "@core/registry";
import { startApp } from "src/app";
import { loadStaticCommands } from "@core/staticLoader";

const registry = new CommandRegistry();

loadStaticCommands(registry);
await startApp(registry);
