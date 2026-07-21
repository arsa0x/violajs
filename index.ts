import type { Config } from "./src/types";
import { start } from "./src/socket";

async function main() {
  const manager = new (await import("./src/manager")).Manager();

  await manager.load();
  const config: Config = await Bun.file("./config.json").json();

  await start(manager, config);
}

void (await main());
