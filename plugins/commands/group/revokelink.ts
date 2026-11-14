import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly, botAdminOnly } from "@middlewares/group-role";

export default defineCommand({
  name: "revokelink",
  aliases: ["resetlink", "revoke"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly(), botAdminOnly()],
  async execute(ctx) {
    try {
      const code = await ctx.sock.groupRevokeInvite(ctx.chat.jid);
      await ctx.send.text(
        `Link undangan berhasil direset. Link baru:\nhttps://chat.whatsapp.com/${code}`,
      );
    } catch (error) {
      ctx.log.error(`Failed to revoke group invite link: ${error}`);
      await ctx.send.text("Gagal mereset link grup.");
    }
  },
});
