import { log } from "@lib/logger";
import fs from "fs/promises";
import path from "path";

const entryDir = path.resolve("./commands");
const generatedDir = path.resolve("./src/generated");
const generatedFile = path.join(generatedDir, "commands.ts");

const files: string[] = [];

async function collect(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collect(fullPath);
      continue;
    }

    if (entry.isFile() && path.extname(entry.name) === ".ts" ||  path.extname(entry.name) === ".js") {
      files.push(fullPath);
    }
  }
}

await collect(entryDir);

files.sort();

await fs.mkdir(generatedDir, {
  recursive: true,
});

const imports: string[] = [];
const commands: string[] = [];

for (const [index, file] of files.entries()) {
  const variable = `command_${index}`;

  let importPath = path.relative(generatedDir, file);
  importPath = importPath.replaceAll(path.sep, "/");

  if (!importPath.startsWith(".")) {
    importPath = `./${importPath}`;
  }

  imports.push(`import ${variable} from "${importPath}";`);

  commands.push(`  ${variable},`);
}

const generated = [
  "// This file is generated. Do not edit manually.",
  "",
  ...imports,
  "",
  "export const commands = [",
  ...commands,
  "];",
  "",
].join("\n");

await fs.writeFile(generatedFile, generated, "utf8");

log.info(`Generated ${files.length} commands.`);

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
