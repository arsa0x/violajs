import { jidNormalizedUser } from "baileys";
import type { Middleware } from "../types/middleware";

export const botAdminOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya dapat digunakan di grup.");
    return;
  }
  try {
    const metadata = await ctx.sock.groupMetadata(ctx.chat.jid);
    const botJid = ctx.sock.user?.id;
    if (!botJid) {
      await ctx.send.text("Identitas bot belum tersedia.");
      return;
    }
    const bot = metadata.participants.find(
      (member) => jidNormalizedUser(member.id) === jidNormalizedUser(botJid),
    );
    if (!bot?.admin) {
      await ctx.send.text("Bot harus menjadi admin grup untuk menjalankan command ini.");
      return;
    }
    await next();
  } catch (error) {
    ctx.log.error(`Failed to verify bot admin: ${error}`);
    await ctx.send.text("Gagal memverifikasi status admin bot.");
  }
};
