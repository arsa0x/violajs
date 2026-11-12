import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";

export default defineCommand({
  name: "delete",
  aliases: ["del", "rm", "hapus"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId || !quoted.participant) {
      await ctx.send.text("Reply pesan yang ingin dihapus, lalu gunakan .del.");
      return;
    }

    try {
      await ctx.sock.sendMessage(ctx.chat.jid, {
        delete: {
          remoteJid: ctx.chat.jid,
          fromMe: quoted.participant === ctx.sock.user?.id,
          id: quoted.stanzaId,
          participant: quoted.participant,
        },
      });
    } catch (error) {
      ctx.log.error(`Failed to delete group message: ${error}`);
      await ctx.send.text(
        "Gagal menghapus pesan. WhatsApp mungkin tidak mengizinkan penghapusan ini.",
      );
    }
  },
});
