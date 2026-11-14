import { existsSync, readdirSync, rmSync } from "fs";
import { parseArgs } from "util";
import type { CommandRegistry } from "@core/command/registry";
import type { EventRegistry } from "@core/events/registry";
import { log } from "@lib/logger";
import { config } from "@/config";

export interface BotOptions {
  pairing?: boolean;
  phone?: string;
}

const SESSION_NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/i;

const requireSessionName = (name: string): string => {
  if (!SESSION_NAME.test(name)) {
    log.error(
      "Invalid session name. Use 1-32 chars: letters, digits, '-' or '_'.",
    );
    process.exit(1);
  }
  return name;
};

function listSessions(sessionPath: string): string[] {
  if (!existsSync(sessionPath)) return [];
  return readdirSync(sessionPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function resolveSession(
  explicit: string | undefined,
  sessionPath: string,
): string {
  if (explicit) return requireSessionName(explicit);
  if (config.main_session) return requireSessionName(config.main_session);

  const existing = listSessions(sessionPath);
  if (existing.length === 1) {
    log.info("Using the only session:", existing[0]);
    return existing[0]!;
  }
  if (existing.length > 1) {
    log.error(
      `Multiple sessions found (${existing.join(", ")}). ` +
        "Use -s <name>, --all, or set main_session in config.ts.",
    );
    process.exit(1);
  }
  return "default";
}

export function cli(
  bot: (
    registry: CommandRegistry,
    eventRegistry: EventRegistry,
    name: string,
    options?: BotOptions,
  ) => Promise<unknown>,
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

  const explicit =
    typeof values.session === "string" ? values.session : undefined;

  switch (cmd) {
    case "create": {
      if (!explicit || values.all) {
        log.error(
          "Enter the name of the session you want to create! e.g. create -s bot1",
        );
        process.exit(1);
      }
      const target = requireSessionName(explicit);
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
        if (!explicit) {
          log.error("Enter a session name or use --all! e.g. delete -s bot1");
          process.exit(1);
        }

        const target = requireSessionName(explicit);

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
          listSessions(sessionPath).map((s) => bot(registry, eventRegistry, s)),
        ).catch((err) => log.error("Error executing parallel sessions:", err));
      } else {
        const target = resolveSession(explicit, sessionPath);
        bot(registry, eventRegistry, target, options);
      }
      break;
    }
  }
}
