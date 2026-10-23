import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";

export default defineCommand({
  name: "add",
  aliases: ["tambah", "+"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    const number = ctx.args[0]?.replace(/\D/g, "");
    if (!number || number.length < 7 || number.length > 15) {
      await ctx.send.text("Gunakan .add <nomor> dengan kode negara, tanpa tanda +.");
      return;
    }
    const target = `${number}@s.whatsapp.net`;
    try {
      const result = await ctx.sock.groupParticipantsUpdate(ctx.chat.jid, [target], "add");
      const status = result[0]?.status;
      if (status === "200") {
        await ctx.sock.sendMessage(ctx.chat.jid, {
          text: `Berhasil menambahkan @${number} ke grup.`,
          mentions: [target],
        }, { quoted: ctx.msg });
        return;
      }
      if (status === "403" || status === "408" || status === "409") {
        const code = await ctx.sock.groupInviteCode(ctx.chat.jid);
        await ctx.send.text(`Tidak dapat menambahkan langsung (status ${status}). Bagikan link undangan ini secara manual:\nhttps://chat.whatsapp.com/${code}`);
        return;
      }
      await ctx.send.text(`Permintaan menambahkan anggota diproses (status: ${status ?? "unknown"}).`);
    } catch (error) {
      ctx.log.error(`Failed to add group participant: ${error}`);
      await ctx.send.text("Gagal menambahkan anggota. Periksa nomor dan hak admin bot.");
    }
  },
});
