import { existsSync, readdirSync, rmSync } from "fs";
import { parseArgs } from "util";
import type { CommandRegistry } from "@core/command/registry";
import type { EventRegistry } from "@core/events/registry";
import { log } from "@lib/logger";

export interface BotOptions {
  pairing?: boolean;
  phone?: string;
}

export function cli(
  bot: (
    registry: CommandRegistry,
    eventRegistry: EventRegistry,
    name: string,
    options?: BotOptions,
  ) => Promise<void>,
  registry: CommandRegistry,
  eventRegistry: EventRegistry,
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
      pairing: {
        type: "boolean",
        short: "p",
        default: false,
      },
      phone: {
        type: "string",
        short: "n",
      },
    },
    strict: false,
    allowPositionals: true,
  });

  const cmd = positionals[0];

  const options: BotOptions = {
    pairing: values.pairing as boolean,
    phone: values.phone as string,
  };

  if (options.pairing && !options.phone) {
    log.error("Phone number is required when using --pairing.");
    process.exit(1);
  }

  if (options.phone && !options.pairing) {
    log.error("Use --pairing when specifying --phone.");
    process.exit(1);
  }

  if (options.phone && !/^\d+$/.test(options.phone)) {
    log.error("Invalid phone number. Use international format without +.");
    process.exit(1);
  }

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
        bot(registry, eventRegistry, target, options);
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
        if (options.pairing) {
          log.error("Phone pairing cannot be used with --all.");
          process.exit(1);
        }

        Promise.all(
          readdirSync(sessionPath).map((session) =>
            bot(registry, eventRegistry, session),
          ),
        ).catch((err) => log.error("Error executing parallel sessions:", err));
      } else if (values.session) {
        bot(registry, eventRegistry, values.session.toString());
      }
      break;
    }
  }
}
