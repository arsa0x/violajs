import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";

export default defineCommand({
  name: "open",
  aliases: ["buka"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chat.jid, "not_announcement");
      await ctx.send.text(
        "Grup dibuka. Semua anggota sekarang dapat mengirim pesan.",
      );
    } catch (error) {
      ctx.log.error(`Failed to open group: ${error}`);
      await ctx.send.text(
        "Gagal membuka grup. Pastikan bot masih menjadi admin.",
      );
    }
  },
});
