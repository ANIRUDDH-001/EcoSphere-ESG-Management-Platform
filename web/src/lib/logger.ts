export const logger = {
  debug: (...args: any[]) => import.meta.env.DEV && console.debug(...args),
  info: (...args: any[]) => import.meta.env.DEV && console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};
