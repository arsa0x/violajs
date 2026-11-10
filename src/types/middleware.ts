import type { CommandContext } from "@core/context";

export type Middleware = (
  ctx: CommandContext,
  next: () => Promise<void>,
) => Promise<void>;
