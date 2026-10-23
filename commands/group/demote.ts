import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";
import { getGroupTarget } from "@utils/group";

export default defineCommand({
  name: "demote",
  aliases: ["unadmin"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    const target = getGroupTarget(ctx);
    if (!target || !target.endsWith("@s.whatsapp.net")) {
      await ctx.send.text("Tag, reply pesan admin, atau gunakan .demote <nomor>.");
      return;
    }
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chat.jid, [target], "demote");
      await ctx.sock.sendMessage(ctx.chat.jid, {
        text: `@ ${target.split("@")[0]} bukan admin lagi.`.replace("@ ", "@"),
        mentions: [target],
      }, { quoted: ctx.msg });
    } catch (error) {
      ctx.log.error(`Failed to demote group participant: ${error}`);
      await ctx.send.text("Gagal menurunkan jabatan admin.");
    }
  },
});
