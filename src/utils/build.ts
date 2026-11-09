import { log } from "@lib/logger";
import fs from "fs/promises";

const result = await Bun.build({
  entrypoints: ["./production.ts"],
  compile: true,
  target: "bun",
  outdir: "./dist",
  minify: {
    identifiers: true,
    whitespace: true,
    syntax: true,
  },
});

if (!result.success) {
  log.error("Build failed:");

  for (const errlog of result.logs) {
    log.error(errlog);
  }

  process.exit(1);
}

await fs.rename("dist/production", "dist/violajs");

log.info("Build successful.");
