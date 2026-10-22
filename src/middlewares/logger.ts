import { type Log } from "@lib/logger";
import type { Middleware } from "../types/middleware";

export const logger =
  (log: Log): Middleware =>
  async (ctx, next) => {
    const start = performance.now();

    log.info(
      `[COMMAND] ${ctx.name} from=${ctx.sender.jid} chat=${ctx.chat.jid}\n`,
      ctx.msg.message,
    );

    try {
      await next();
    } finally {
      const elapsed = performance.now() - start;
      log.info(`[COMMAND] ${ctx.name} finished in ${elapsed.toFixed(2)}ms`);
    }
  };
