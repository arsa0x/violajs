export const log = {
  info: (message?: any) => console.log(`[\x1b[32mINFO\x1b[0m] ${message}`),
  warn: (message?: any) => console.warn(`[\x1b[33mWARN\x1b[0m] ${message}`),
  error: (message?: any) =>
    console.error(`\x1b[0m[\x1b[31mERROR\x1b[0m] ${message}`),
  debug: (message?: any) => console.debug(`[\x1b[90mDEBUG\x1b[0m] ${message}`),
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
