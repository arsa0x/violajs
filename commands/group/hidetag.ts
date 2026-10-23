import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";

export default defineCommand({
  name: "hidetag",
  aliases: ["h"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly()],
  async execute(ctx) {
    try {
      const metadata = await ctx.sock.groupMetadata(ctx.chat.jid);
      const mentions = metadata.participants.map((participant) => participant.id);
      const text = ctx.args.join(" ").trim() || "Pengumuman grup";
      await ctx.sock.sendMessage(ctx.chat.jid, { text, mentions }, { quoted: ctx.msg });
    } catch (error) {
      ctx.log.error(`Failed to send hidetag: ${error}`);
      await ctx.send.text("Gagal mengirim pengumuman grup.");
    }
  },
});
