import { jidNormalizedUser } from "baileys";
import type { Middleware } from "@src/types/middleware";

export const botAdminOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya dapat digunakan di grup.");
    return;
  }
  try {
    const metadata = await ctx.sock.groupMetadata(ctx.chat.jid);
    const botJid = jidNormalizedUser(ctx.sock.user?.id);
    if (!botJid) {
      await ctx.send.text("Identitas bot belum tersedia.");
      return;
    }

    const bot = metadata.participants.find((par) => par.phoneNumber === botJid);

    if (bot?.admin !== "admin") {
      await ctx.send.text(
        "Bot harus menjadi admin grup untuk menjalankan command ini.",
      );
      return;
    }

    await next();
  } catch (error) {
    ctx.log.error(`Failed to verify bot admin: ${error}`);
    await ctx.send.text("Gagal memverifikasi status admin bot.");
  }
};
