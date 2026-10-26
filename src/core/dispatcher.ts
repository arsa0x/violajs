import { Args } from "@lib/args";
import type { Middleware } from "../types/middleware";
import type { Context } from "./context";
import { runMiddleware } from "./middleware";
import { CommandRegistry } from "./registry";

export class CommandDispatcher {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly globalMiddleware: readonly Middleware[] = [],
  ) {}

  async dispatch(ctx: Context): Promise<void> {
    const command = this.registry.resolve(ctx.name);
    if (!command) return;

    if (command.flags?.length) {
      ctx.args = Args.parse(ctx.rawArgs, command.flags);
    }

    const middleware = [
      ...this.globalMiddleware,
      ...(command.middleware ?? []),
    ];

    await runMiddleware(middleware, ctx, () => command.execute(ctx));
  }
}
