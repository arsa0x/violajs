
import type { Context } from "@core/context";
import type { Middleware } from "./middleware";

export type Category =
  | "tools"
  | "downloader"
  | "maker"
  | "nsfw"
  | "ai"
  | "game"
  | "search"
  | "admin";

export type Command = {
  name: string;
  aliases?: string[];
  category?: Category;
  middleware?: Middleware[];
  execute: (ctx: Context) => Promise<void>;
};
