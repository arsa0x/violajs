export const log = {
  info: (...args: unknown[]) => console.log(`[\x1b[32mINFO\x1b[0m]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[\x1b[33mWARN\x1b[0m]`, ...args),
  error: (...args: unknown[]) =>
    console.error(`[\x1b[31mERROR\x1b[0m]`, ...args),
  debug: (...args: unknown[]) =>
    console.debug(`[\x1b[90mDEBUG\x1b[0m]`, ...args),
};

export const logger = {
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
