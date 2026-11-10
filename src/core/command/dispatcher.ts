import { Args, FlagSpec } from "@lib/args";
import type { Middleware } from "@src/types/middleware";
import type { CommandContext } from "@core/context";
import { runMiddleware } from "@core/middleware";
import { CommandRegistry } from "./registry";
import { generateCommandHelp } from "@utils/command-help";

const HELP_FLAG = FlagSpec.bool(["--help", "-h"]).description(
  "Show command help.",
);

export class CommandDispatcher {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly globalMiddleware: readonly Middleware[] = [],
  ) {}

  async dispatch(ctx: CommandContext): Promise<void> {
    const command = this.registry.resolve(ctx.name);
    if (!command) return;

    ctx.args = Args.parse(ctx.rawArgs, [...(command.flags ?? []), HELP_FLAG]);

    if (ctx.args.flag("--help")) {
      await runMiddleware(this.globalMiddleware, ctx, async () => {
        const name = command.name;
        await ctx.send.interactive.inAppSignup({
          title: name.charAt(0).toUpperCase() + name.slice(1),
          body: generateCommandHelp(command),
        });
      });
      return;
    }

    const middleware = [
      ...this.globalMiddleware,
      ...(command.middleware ?? []),
    ];

    await runMiddleware(middleware, ctx, () => command.execute(ctx));
  }
}
