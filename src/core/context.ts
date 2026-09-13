import type { WASocket, WAMessage } from "baileys";
import type { ParsedCommand } from "./parser";
import { config } from "../../config";

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

  constructor(params: {
    sock: WASocket;
    message: WAMessage;
    text: string;
    parsed: ParsedCommand;
    jid: any;
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
  }

  async reply(text: string): Promise<void> {
    this.sock.sendMessage(this.chat.jid, { text: text }, { quoted: this.msg });
  }
}
