import type { Context } from "../types/context";
import { runMiddleware } from "./middleware";
import type { CommandRegistry } from "./registry";

export class CommandDispatcher {
  constructor(private readonly registry: CommandRegistry) {}

  async dispatch(ctx: Context): Promise<void> {
    const command = this.registry.resolve(ctx.name);
    if (!command) return;

    await runMiddleware(command.middleware ?? [], ctx, () =>
      command.execute(ctx),
    );
  }
}
