import { log } from "@lib/logger";

const result = await Bun.build({
  entrypoints: ["./index.ts"],
  compile: true,
  target: "bun",
  outdir: "./dist/violajs",
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

log.info("Build successful.");
