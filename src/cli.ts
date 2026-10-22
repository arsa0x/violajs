import type { CommandRegistry } from "@core/registry";
import { log } from "@lib/logger";
import { existsSync, readdirSync, rmSync } from "fs";
import { parseArgs } from "util";

export function cli(
  bot: (registry: CommandRegistry, name: string) => Promise<void>,
  registry: CommandRegistry,
  sessionPath: string,
) {
  const getPath = (name: string) => `${sessionPath}/${name}`;

  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      session: {
        type: "string",
        short: "s",
        default: "default",
      },
      all: {
        type: "boolean",
        short: "a",
        default: false,
      },
    },
    strict: false,
    allowPositionals: true,
  });

  const cmd = positionals[0];

  switch (cmd) {
    case "create": {
      const target = values.session.toString();
      if (!target || values.all) {
        log.error(
          "Enter the name of the session you want to create! e.g. --session=bot1",
        );
        process.exit();
      }

      if (existsSync(getPath(target))) {
        log.warn("Session", target, "already exists");
      } else {
        bot(registry, target);
      }
      break;
    }
    case "delete": {
      if (values.all) {
        if (existsSync(sessionPath)) {
          rmSync(sessionPath, { recursive: true, force: true });
          log.info("All sessions were successfully deleted.");
        } else {
          log.warn("The session directory is empty.");
        }
      } else {
        const target = values.session.toString();
        if (!target) {
          log.error(
            "Enter a session name or use the --all flag! e.g. delete -s bot1",
          );
          process.exit(1);
        }

        if (existsSync(getPath(target))) {
          rmSync(getPath(target), { recursive: true, force: true });
          log.info("Session", target, "successfully deleted.");
        } else {
          log.error("Session", target, "not found.");
        }
      }
      break;
    }
    default: {
      if (values.all) {
        Promise.all(
          readdirSync(sessionPath).map((s) => bot(registry, s)),
        ).catch((err) => log.error("Error executing parallel sessions:", err));
      } else if (values.session) {
        bot(registry, values.session.toString());
      }
      break;
    }
  }
}
