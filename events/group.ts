import { defineEvent } from "@core/event";

export default defineEvent({
  name: "group",
  events: {
    "baileys.group-participants.update": async (ctx) => {
      const { id, participants, action } = ctx.event;

      if (action === "add") {
        await ctx.sock.sendMessage(id, {
          text: `Welcome ${participants.length} new member(s)!`,
        });
      }
    },
  },
});
