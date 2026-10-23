import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { botAdminOnly } from "@middlewares/bot-admin";

export default defineCommand({
  name: "linkgc",
  aliases: ["linkgrup", "linkgroup"],
  category: "admin",
  middleware: [groupOnly(), botAdminOnly()],
  async execute(ctx) {
    try {
      const code = await ctx.sock.groupInviteCode(ctx.chat.jid);
      await ctx.send.text(`Link grup:\nhttps://chat.whatsapp.com/${code}`);
    } catch (error) {
      ctx.log.error(`Failed to get group invite link: ${error}`);
      await ctx.send.text("Gagal mengambil link grup.");
    }
  },
});
