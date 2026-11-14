import type { CommandContext } from "@core/context";
import type { Middleware } from "./middleware";
import type { FlagSpec } from "@lib/args";

export type Category =
  | "tools"
  | "downloader"
  | "maker"
  | "nsfw"
  | "ai"
  | "game"
  | "search"
  | "admin"
  | "uncategorized";

export type CommandPlugin = {
  name: string;
  aliases?: string[];
  category?: Category;
  description?: string;

  // Documentation metadata
  usage?: string[];

  middleware?: Middleware[];
  flags?: FlagSpec[];
  execute: (ctx: CommandContext) => Promise<void>;
  // clear timers, close handles, etc. when replaced/removed
  dispose?: () => void | Promise<void>;
};
