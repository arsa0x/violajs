import { log } from "@lib/logger";

const configFile = Bun.file("config.ts");

if (!(await configFile.exists())) {
  log.info("Config file not found. Generating a new one...");
  const template = await Bun.file("config.ts.example").text();
  await Bun.write(configFile, template);
}
