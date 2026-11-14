import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly, botAdminOnly } from "@middlewares/group-role";

export default defineCommand({
  name: "close",
  aliases: ["tutup"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chat.jid, "announcement");
      await ctx.send.text(
        "Grup ditutup. Hanya admin yang dapat mengirim pesan.",
      );
    } catch (error) {
      ctx.log.error(`Failed to close group: ${error}`);
      await ctx.send.text(
        "Gagal menutup grup. Pastikan bot masih menjadi admin.",
      );
    }
  },
});
