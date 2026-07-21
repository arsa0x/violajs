import { type WASocket } from "baileys";

export type Config = {
  owners: string[];
  prefix: string;
};

export type Context = {
  jid: string;
  args: string[];
  sock: WASocket;
};

export type Plugin = {
  name: string;
  aliases?: string[];
  description?: string;
  category: "tools" | "downloader" | "nsfw" | "maker";
  ownerOnly?: boolean;
  groupOnly?: boolean;
  execute: (ctx: Context) => Promise<void>;
};
