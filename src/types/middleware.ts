import type { Context } from "../core/context";

export type Middleware = (
  ctx: Context,
  next: () => Promise<void>,
) => Promise<void>;
