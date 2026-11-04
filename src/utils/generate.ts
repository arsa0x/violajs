import { log } from "@lib/logger";
import fs from "fs/promises";
import path from "path";

const entryDir = path.resolve("./commands");
const generatedDir = path.resolve("./src/generated");
const commandFile = path.join(generatedDir, "commands.ts");
const menuFile = path.join(generatedDir, "menu.ts");

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

    if (
      (entry.isFile() && path.extname(entry.name) === ".ts") ||
      path.extname(entry.name) === ".js"
    ) {
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
  const variable = `_${index}`;

  let importPath = path.relative(generatedDir, file);
  importPath = importPath.replaceAll(path.sep, "/");

  if (!importPath.startsWith(".")) {
    importPath = `./${importPath}`;
  }

  imports.push(`import ${variable} from "${importPath}";`);
  commands.push(`${variable}`);
}

const commandsLine = `export const commands = [${commands}];`;

const generatedCommands = [
  "// This file is generated. Do not edit manually.",
  "",
  ...imports,
  "",
  commandsLine,
  "",
].join("\n");

await fs.writeFile(commandFile, generatedCommands, "utf8");

import { commands as cmds } from "../generated/commands";
import type { Category } from "../types/command";
import { config } from "config";

const categoryTitles: Record<Category, string> = {
  tools: "Tools",
  downloader: "Downloader",
  search: "Search",
  admin: "Group administration",
  nsfw: "NSFW",
  ai: "AI",
  game: "Game",
  maker: "Maker",
  uncategorized: "Uncategorized",
};

const menuGroups: Record<string, any[]> = Object.keys(categoryTitles).reduce(
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

const menuEntries = Object.entries(categoryTitles).map(([key, title]) => {
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

log.info(`Generated ${files.length} commands and menu.ts successfully.`);
