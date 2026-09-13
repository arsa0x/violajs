import type { Middleware } from "../types/middleware"

export const logger = (): Middleware => async (ctx, next) => {
  const start = performance.now()

  console.log(
    `[COMMAND] ${ctx.name} from=${ctx.sender.jid} chat=${ctx.chat.jid}`,
  )

  try {
    await next()
  } finally {
    const elapsed = performance.now() - start
    console.log(
      `[COMMAND] ${ctx.name} finished in ${elapsed.toFixed(2)}ms`,
    )
  }
}
