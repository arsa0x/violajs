import type { Context } from "@core/context";
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

export type Command = {
  name: string;
  aliases?: string[];
  category?: Category;
  description?: string;

  // Documentation metadata
  usage?: string[];
  examples?: string[];

  middleware?: Middleware[];
  flags?: FlagSpec[];
  execute: (ctx: Context) => Promise<void>;
};
