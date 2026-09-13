import type { Context } from "../types/context";
import type { Middleware } from "../types/middleware";

export async function runMiddleware(
  middleware: Middleware[],
  ctx: Context,
  handler: () => Promise<void>,
): Promise<void> {
  let index = -1;

  async function dispatch(position: number): Promise<void> {
    if (position <= index) {
      throw new Error("next() called multiple times");
    }

    index = position;
    const fn = middleware[position];

    if (!fn) {
      await handler();
      return;
    }

    await fn(ctx, () => dispatch(position + 1));
  }

  await dispatch(0);
}
