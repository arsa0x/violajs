export interface Log {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export const log: Log = {
  info: (...args: unknown[]) => console.log(`[\x1b[32mINFO\x1b[0m]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[\x1b[33mWARN\x1b[0m]`, ...args),
  error: (...args: unknown[]) =>
    console.error(`[\x1b[31mERROR\x1b[0m]`, ...args),
  debug: (...args: unknown[]) =>
    console.debug(`[\x1b[90mDEBUG\x1b[0m]`, ...args),
};

export function createSessionLogger(sessionName: string): Log {
  const prefix = `[\x1b[1m\x1b[36m${sessionName}\x1b[0m]`;

  return {
    info: (...args: unknown[]) => log.info(prefix, ...args),
    warn: (...args: unknown[]) => log.warn(prefix, ...args),
    error: (...args: unknown[]) => log.error(prefix, ...args),
    debug: (...args: unknown[]) => log.debug(prefix, ...args),
  };
}

export const logger = (log: Log) => {
  return {
    level: "warn",
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: (...args: unknown[]) => log.warn(...args),
    error: (...args: unknown[]) => log.error(...args),
    child() {
      return this;
    },
  };
};
