import { type WAMessage, type WASocket } from "baileys";

export type Context = {
  jid: string;
  args: string[];
  sock: WASocket;
  msg: WAMessage;
};

export type Plugin = {
  name: string;
  aliases?: string[];
  description?: string;
  category: "tools" | "downloader" | "nsfw" | "maker" | "search";
  ownerOnly?: boolean;
  groupOnly?: boolean;
  execute: (ctx: Context) => Promise<void>;
};

export type Config = {
  owners: string[];
  prefix: string;
};
