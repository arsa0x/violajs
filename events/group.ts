import { defineEvent } from "@core/event";

export default defineEvent({
  name: "group",
  events: {
    "baileys.group-participants.update": async ({ event, sock, log }) => {
      const { id, participants, action } = event;

      if (action === "add") {
        await sock.sendMessage(id, {
          text: `Welcome ${participants.length} new member(s)!`,
        });
      }
    },
  },
});
