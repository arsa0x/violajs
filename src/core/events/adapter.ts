import type { WASocket } from "@oxidezap/baileyrs";
import type { EventDispatcher } from "./dispatcher";

export function attachBaileysEventAdapter(
  sock: WASocket,
  dispatcher: EventDispatcher,
): void {
  sock.ev.on("messages.upsert", async (payload) => {
    await dispatcher.dispatch("baileys.messages.upsert", payload);
  });

  sock.ev.on("connection.update", async (payload) => {
    await dispatcher.dispatch("baileys.connection.update", payload);

    if (payload.connection === "open") {
      await dispatcher.dispatch("connection.open", {
        userJid: sock.user?.id ?? "",
      });
    } else if (payload.connection === "close") {
      const statusCode = (
        payload.lastDisconnect?.error as
          { output?: { statusCode?: number } } | undefined
      )?.output?.statusCode;

      await dispatcher.dispatch("connection.close", {
        reason: statusCode === undefined ? undefined : String(statusCode),
      });
    }
  });

  sock.ev.on("group-participants.update", async (payload) => {
    await dispatcher.dispatch("baileys.group-participants.update", payload);

    const participants = payload.participants.map(
      (participant) => participant.id,
    );

    if (payload.action === "add") {
      await dispatcher.dispatch("group.participant.join", {
        groupJid: payload.id,
        participants,
        author: payload.author,
      });
    } else if (payload.action === "remove") {
      await dispatcher.dispatch("group.participant.leave", {
        groupJid: payload.id,
        participants,
        author: payload.author,
      });
    }
  });
}
