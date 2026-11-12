import fs from "fs/promises";
import path from "path";

const entryDir = path.resolve("./plugins/commands");
const eventsDir = path.resolve("./plugins/events");
const generatedDir = path.resolve("./src/generated");
const commandFile = path.join(generatedDir, "commands.js");
const eventFile = path.join(generatedDir, "events.js");
const menuFile = path.join(generatedDir, "menu.js");

const files: string[] = [];
const eventFiles: string[] = [];

async function collect(dir: string, output: string[]): Promise<void> {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collect(fullPath, output);
      continue;
    }

    if (entry.isFile() && [".ts", ".js"].includes(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
}

await collect(entryDir, files);
await collect(eventsDir, eventFiles);
files.sort();
eventFiles.sort();

await fs.mkdir(generatedDir, { recursive: true });

function generateImports(
  sourceFiles: string[],
  outputFile: string,
  exportName: string,
): string {
  const imports: string[] = [];
  const entries: string[] = [];

  for (const [index, file] of sourceFiles.entries()) {
    const variable = `_${index}`;
    let importPath = path.relative(generatedDir, file);
    importPath = importPath.replaceAll(path.sep, "/");

    if (!importPath.startsWith(".")) importPath = `./${importPath}`;
    const finalPath = importPath.includes("commands/")
      ? importPath.replace("../../plugins/", "@plugins/")
      : importPath.replace("../../plugins/", "@plugins/");
    imports.push(`import ${variable} from "${finalPath}";`);
    entries.push(variable);
  }

  return [
    "// This file is generated. Do not edit manually.",
    "",
    ...imports,
    "",
    `export const ${exportName} = [${entries.join(", ")}];`,
    "",
  ].join("\n");
}

await fs.writeFile(
  commandFile,
  generateImports(files, commandFile, "commands"),
  "utf8",
);
await fs.writeFile(
  eventFile,
  generateImports(eventFiles, eventFile, "events"),
  "utf8",
);

// Import only after writing the registry so newly added commands are included
// in this same generator run.
const { commands: cmds } = await import("@src/generated/commands");

import { config } from "config";
import { CATEGORY_TITLES } from "./category";
import { log } from "@lib/logger";

const menuGroups: Record<string, any[]> = Object.keys(CATEGORY_TITLES).reduce(
  (acc, key) => {
    acc[key] = [];
    return acc;
  },
  {} as Record<string, any[]>,
);

for (const cmd of cmds) {
  const category =
    cmd.category && menuGroups[cmd.category] ? cmd.category : "uncategorized";
  const title = cmd.name;
  const description = cmd.description || "No description provided";

  menuGroups[category]!.push({
    title,
    description,
    id: `${config.prefix}${title} --help`,
  });
}

const menuEntries = Object.entries(CATEGORY_TITLES).map(([key, title]) => {
  const rows = menuGroups[key] || [];
  const rowsStr = rows
    .map(
      (r) =>
        `    { title: ${JSON.stringify(r.title)}, description: ${JSON.stringify(r.description)}, id: ${JSON.stringify(r.id)} },`,
    )
    .join("\n");

  return `  ${key}: {\n    title: ${JSON.stringify(title)},\n    rows: [\n${rowsStr}\n    ],\n  },`;
});

const generatedMenu = [
  "// This file is generated. Do not edit manually.",
  "",
  "export const MENU = {",
  ...menuEntries,
  "};",
  "",
].join("\n");

await fs.writeFile(menuFile, generatedMenu, "utf8");

log.info(
  `Generated ${files.length} commands, ${eventFiles.length} event plugins and menu.ts successfully.`,
);
