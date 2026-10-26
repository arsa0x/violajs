import type { WASocket, WAMessage } from "baileys";
import type { ParsedCommand } from "./parser";
import { config } from "../../config";
import { Send } from "@lib/send";
import { type Log } from "@lib/logger";
import type { Args } from "@lib/args";

export class Context {
  log: Log;
  sock: WASocket;
  msg: WAMessage;
  name: string;
  text: string;
  rawArgs: string[];
  args?: Args;
  sender: {
    jid: string;
    isOwner: boolean;
  };
  chat: {
    jid: string;
    isGroup: boolean;
  };
  send: Send;

  constructor(params: {
    sock: WASocket;
    message: WAMessage;
    text: string;
    parsed: ParsedCommand;
    jid: string;
    log: Log;
  }) {
    const senderJid = params.message!.key.participant ?? params.jid;

    this.log = params.log;
    this.sock = params.sock;
    this.msg = params.message;
    this.text = params.text!;
    this.name = params.parsed!.name;
    this.rawArgs = params.parsed!.args;
    this.chat = {
      jid: params.jid,
      isGroup: params.jid.endsWith("@g.us"),
    };
    this.sender = {
      jid: senderJid,
      isOwner: config.owners.has(senderJid),
    };
    this.send = new Send(params.sock, params.message, params.jid);
  }
}
