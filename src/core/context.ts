import type { WASocket, WAMessage } from "baileys";
import type { ParsedCommand } from "./parser";
import { config } from "../../config";
import { Reply } from "@lib/reply";

export class Context {
  sock: WASocket;
  msg: WAMessage;
  name: string;
  text: string;
  args: string[];
  sender: {
    jid: string;
    isOwner: boolean;
  };
  chat: {
    jid: string;
    isGroup: boolean;
  };
  reply: Reply;

  constructor(params: {
    sock: WASocket;
    message: WAMessage;
    text: string;
    parsed: ParsedCommand;
    jid: string;
  }) {
    const senderJid = params.message!.key.participant ?? params.jid;

    this.sock = params.sock;
    this.msg = params.message;
    this.text = params.text!;
    this.name = params.parsed!.name;
    this.args = params.parsed!.args;
    this.chat = {
      jid: params.jid,
      isGroup: params.jid.endsWith("@g.us"),
    };
    this.sender = {
      jid: senderJid,
      isOwner: config.owners.has(senderJid),
    };
    this.reply = new Reply(params.sock, params.message, params.jid);
  }
}
