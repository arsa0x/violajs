import { jidNormalizedUser } from "@oxidezap/baileyrs";
import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly, botAdminOnly } from "@middlewares/group-role";
import { getGroupTarget, isGroupParticipant } from "@utils/group";

export default defineCommand({
  name: "kick",
  aliases: ["tendang"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    const target = getGroupTarget(ctx);
    if (!target) {
      await ctx.send.text(
        "Tag, reply pesan anggota, atau gunakan .kick <nomor>.",
      );
      return;
    }

    const botJid = ctx.sock.user?.id;
    if (botJid && jidNormalizedUser(target) === jidNormalizedUser(botJid)) {
      await ctx.send.text("Bot tidak dapat mengeluarkan dirinya sendiri.");
      return;
    }

    try {
      if (!(await isGroupParticipant(ctx, target))) {
        await ctx.send.text("Target bukan anggota grup ini.");
        return;
      }
      await ctx.sock.groupParticipantsUpdate(ctx.chat.jid, [target], "remove");
      await ctx.sock.sendMessage(
        ctx.chat.jid,
        {
          text: `Anggota @${target.split("@")[0]} dikeluarkan dari grup.`,
          mentions: [target],
        },
        { quoted: ctx.msg },
      );
    } catch (error) {
      ctx.log.error(`Failed to remove group participant: ${error}`);
      await ctx.send.text(
        "Gagal mengeluarkan anggota. Periksa target dan hak admin bot.",
      );
    }
  },
});
