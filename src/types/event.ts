import type { WASocket, WAMessage, BaileysEventMap } from "baileys";
import type { Log } from "@lib/logger";

export type InternalEventMap = {
  "message.received": {
    message: WAMessage;
    text: string;
    chat: { jid: string; isGroup: boolean };
    sender: { jid: string };
  };
  "group.participant.join": {
    groupJid: string;
    participants: string[];
    author?: string;
  };
  "group.participant.leave": {
    groupJid: string;
    participants: string[];
    author?: string;
  };
  "connection.open": { userJid: string };
  "connection.close": { reason?: string };
};

export type RawBaileysEventMap = {
  "baileys.messages.upsert": BaileysEventMap["messages.upsert"];
  "baileys.connection.update": BaileysEventMap["connection.update"];
  "baileys.group-participants.update": BaileysEventMap["group-participants.update"];
};

export type EventMap = InternalEventMap & RawBaileysEventMap;
export type EventName = keyof EventMap;

export type EventContext<T> = {
  sock: WASocket;
  log: Log;
  pluginName: string;
  event: T;
};

export type EventHandler<T> = (ctx: EventContext<T>) => Promise<void>;

export type EventHandlers = {
  [K in EventName]?: EventHandler<EventMap[K]>;
};

export type EventPlugin = {
  name: string;
  events: EventHandlers;
};
