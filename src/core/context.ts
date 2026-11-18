import { type WASocket, type WAMessage, jidNormalizedUser } from "@oxidezap/baileyrs";
import type { ParsedCommand } from "./parser";
import { config } from "@/config";
import { Send } from "@lib/send";
import { type Log } from "@lib/logger";
import type { Args } from "@lib/args";
import type { CommandPlugin } from "../types/command";

export class BaseContext {
  sock: WASocket;
  log: Log;

  constructor(sock: WASocket, log: Log) {
    this.sock = sock;
    this.log = log;
  }
}

export class EventContext<TEvent> extends BaseContext {
  pluginName: string;
  event: TEvent;

  constructor(params: {
    sock: WASocket;
    log: Log;
    pluginName: string;
    event: TEvent;
  }) {
    super(params.sock, params.log);

    this.pluginName = params.pluginName;
    this.event = params.event;
  }
}

export class CommandContext extends BaseContext {
  msg: WAMessage;
  command?: CommandPlugin;
  name: string;
  text: string;
  rawArgs: string[];
  args?: Args;
  sender: {
    jid: string;
    ids: string[];
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
    super(params.sock, params.log);

    const senderJid = params.message.key.participant ?? params.jid;

    this.msg = params.message;
    this.text = params.text;
    this.name = params.parsed.name;
    this.rawArgs = params.parsed.args;

    this.chat = {
      jid: params.jid,
      isGroup: params.jid.endsWith("@g.us"),
    };

    const key = params.message.key as {
      participant?: string;
      participantAlt?: string;
      remoteJidAlt?: string;
    };
    const ids = [
      key.participant ?? params.jid,
      key.participantAlt,
      key.remoteJidAlt,
    ]
      .filter((x): x is string => !!x)
      .map(jidNormalizedUser);

    this.sender = {
      jid: ids[0]!,
      ids,
      isOwner: ids.some((id) => config.owners.has(id)),
    };

    this.send = new Send(params.sock, params.message, params.jid);
  }
}
