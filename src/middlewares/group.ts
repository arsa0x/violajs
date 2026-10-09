import type { Middleware } from "../types/middleware";

export const groupOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.chat.isGroup) {
    await ctx.send.text("Command ini hanya dapat digunakan di group.");
    return;
  }

  await next();
};
