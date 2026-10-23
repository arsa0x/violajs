import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";
import { getGroupTarget } from "@utils/group";

export default defineCommand({
  name: "promote",
  aliases: ["admin"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    const target = getGroupTarget(ctx);
    if (!target || !target.endsWith("@s.whatsapp.net")) {
      await ctx.send.text("Tag, reply pesan anggota, atau gunakan .promote <nomor>.");
      return;
    }
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chat.jid, [target], "promote");
      await ctx.sock.sendMessage(ctx.chat.jid, {
        text: `@ ${target.split("@")[0]} sekarang menjadi admin grup.`.replace("@ ", "@"),
        mentions: [target],
      }, { quoted: ctx.msg });
    } catch (error) {
      ctx.log.error(`Failed to promote group participant: ${error}`);
      await ctx.send.text("Gagal menjadikan anggota sebagai admin.");
    }
  },
});
