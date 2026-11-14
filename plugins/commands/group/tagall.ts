import { defineCommand } from "@core/command";
import { groupOnly } from "@middlewares/group";
import { groupAdminOnly } from "@middlewares/group-role";

export default defineCommand({
  name: "tagall",
  aliases: ["everyone", "all"],
  category: "admin",
  middleware: [groupOnly(), groupAdminOnly()],
  async execute(ctx) {
    try {
      const metadata = await ctx.sock.groupMetadata(ctx.chat.jid);
      const participants = metadata.participants;
      const mentions = participants.map((participant) => participant.id);
      const lines = participants.map(
        (participant) => `• @${participant.id.split("@")[0]}`,
      );
      await ctx.sock.sendMessage(
        ctx.chat.jid,
        {
          text: [
            "*TAG ALL MEMBER*",
            `Grup: ${metadata.subject || "Grup"}`,
            `Member: ${participants.length}`,
            ctx.rawArgs.length ? `Pesan: ${ctx.rawArgs.join(" ")}` : "",
            "",
            ...lines,
          ]
            .filter(Boolean)
            .join("\n"),
          mentions,
        },
        { quoted: ctx.msg },
      );
    } catch (error) {
      ctx.log.error(`Failed to tag group members: ${error}`);
      await ctx.send.text("Gagal mengambil daftar anggota grup.");
    }
  },
});
