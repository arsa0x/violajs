import type { Middleware } from "@src/types/middleware";
import type { CommandContext } from "./context";

export async function runMiddleware(
  middleware: readonly Middleware[],
  ctx: CommandContext,
  handler: () => Promise<void>,
): Promise<void> {
  let index = -1;

  const dispatch = async (position: number): Promise<void> => {
    if (position <= index) {
      throw new Error("next() called multiple times");
    }

    index = position;
    const current = middleware[position];

    if (!current) {
      await handler();
      return;
    }

    let called = false;

    await current(ctx, async () => {
      if (called) {
        throw new Error("next() called multiple times");
      }

      called = true;
      await dispatch(position + 1);
    });
  };

  await dispatch(0);
}

export function withMiddleware(
  middleware: readonly Middleware[],
  handler: (ctx: CommandContext) => Promise<void>,
): (ctx: CommandContext) => Promise<void> {
  return (ctx) => runMiddleware(middleware, ctx, () => handler(ctx));
}
