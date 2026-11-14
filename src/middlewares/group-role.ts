import type { Middleware } from "@src/types/middleware";
import {
  botIds,
  findParticipant,
  getGroupMetadata,
  isAdmin,
} from "@utils/identity";

const roleOnly =
  (who: "sender" | "bot", denied: string): Middleware =>
  async (ctx, next) => {
    if (!ctx.chat.isGroup) {
      await ctx.send.text("Command ini hanya dapat digunakan di grup.");
      return;
    }
    try {
      const meta = await getGroupMetadata(ctx.sock, ctx.chat.jid);
      const ids = who === "bot" ? botIds(ctx.sock) : ctx.sender.ids;
      if (!isAdmin(findParticipant(meta, ids))) {
        await ctx.send.text(denied);
        return;
      }
    } catch (error) {
      ctx.log.error(`Role check failed (${who}):`, error);
      await ctx.send.text("Gagal memverifikasi status admin.").catch(() => {});
      return;
    }
    await next();
  };

export const groupAdminOnly = () =>
  roleOnly("sender", "Command ini hanya dapat digunakan oleh admin grup.");
export const botAdminOnly = () =>
  roleOnly(
    "bot",
    "Bot harus menjadi admin grup untuk menjalankan command ini.",
  );
