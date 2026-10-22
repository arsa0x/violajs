import { log } from "@lib/logger";
import { existsSync, rmSync } from "fs";
import { parseArgs } from "util";

export function cli(sessionPath: string) {
  const getPath = (name: string) => `sessionPath/${name}`;

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
      const target = values.session;
      if (!target || values.all) {
        log.error(
          "Enter the name of the session you want to create! e.g. --session=bot1",
        );
        process.exit();
      }

      // TO DO: if session exists
      if (true) {
        log.warn("session", target, "already exists");
      } else {
        // TO DO: create new session
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
    default:
      break;
  }
}
