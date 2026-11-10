import { jidNormalizedUser } from "baileys";
import type { Middleware } from "@src/types/middleware";

export const groupAdminOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya dapat digunakan di grup.");
    return;
  }
  try {
    const metadata = await ctx.sock.groupMetadata(ctx.chat.jid);
    const senderJid = jidNormalizedUser(ctx.sender.jid);
    const participant = metadata.participants.find(
      (member) => jidNormalizedUser(member.id) === senderJid,
    );
    if (!participant?.admin) {
      await ctx.send.text("Command ini hanya dapat digunakan oleh admin grup.");
      return;
    }
    await next();
  } catch (error) {
    ctx.log.error(`Failed to verify group admin: ${error}`);
    await ctx.send.text("Gagal memverifikasi status admin grup.");
  }
};
