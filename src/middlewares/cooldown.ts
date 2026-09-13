import type { Middleware } from "../types/middleware";

export const cooldown = (durationMs: number): Middleware => {
  const lastRun = new Map<string, number>();

  return async (ctx, next) => {
    const key = `${ctx.sender.jid}:${ctx.name}`;
    const now = Date.now();
    const previous = lastRun.get(key) ?? 0;
    const remaining = durationMs - (now - previous);

    if (remaining > 0) {
      await ctx.reply(
        `Tunggu ${Math.ceil(remaining / 1000)} detik sebelum menggunakan command ini lagi.`,
      );
      return;
    }

    lastRun.set(key, now);
    await next();
  };
};
