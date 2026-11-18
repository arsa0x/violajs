import { jidNormalizedUser } from "@oxidezap/baileyrs";
import type { Middleware } from "@src/types/middleware";

export const cooldown = (durationMs: number): Middleware => {
  const state = new Map<string, { at: number; warned: boolean }>();

  const sweep = (now: number) => {
    if (state.size < 1_000) return;
    for (const [k, v] of state) if (now - v.at > durationMs) state.delete(k);
  };

  return async (ctx, next) => {
    const now = Date.now();
    sweep(now);
    const cmd = ctx.command?.name ?? ctx.name;
    const session = ctx.sock.user?.id
      ? jidNormalizedUser(ctx.sock.user.id)
      : "";
    const key = `${session}|${ctx.sender.jid}|${cmd}`;

    const entry = state.get(key);
    const remaining = entry ? durationMs - (now - entry.at) : 0;
    if (entry && remaining > 0) {
      if (!entry.warned) {
        entry.warned = true;
        await ctx.send.text(
          `Tunggu ${Math.ceil(remaining / 1000)} detik sebelum menggunakan command ini lagi.`,
        );
      }
      return;
    }
    state.set(key, { at: now, warned: false });
    await next();
  };
};
