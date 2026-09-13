import type { Middleware } from "../types/middleware"

export const ownerOnly = (): Middleware => async (ctx, next) => {
  if (!ctx.sender.isOwner) {
    await ctx.reply.text('Command ini hanya dapat digunakan oleh owner.')
    return
  }

  await next()
}
