import type { Middleware } from "@src/types/middleware";

export const ownerOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.sender.isOwner) {
    await ctx.send.text("Command ini hanya dapat digunakan oleh owner.");
    return;
  }

  await next();
};
