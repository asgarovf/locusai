import { $FixMe } from "@locusai/shared";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(
    level: LogLevel,
    service: string,
    message: string,
    meta?: $FixMe
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${service}] ${message}${metaStr}`;
  }

  debug(service: string, message: string, meta?: $FixMe) {
    if (process.env.DEBUG)
      console.debug(this.formatMessage("debug", service, message, meta));
  }

  info(service: string, message: string, meta?: $FixMe) {
    console.info(this.formatMessage("info", service, message, meta));
  }

  warn(service: string, message: string, meta?: $FixMe) {
    console.warn(this.formatMessage("warn", service, message, meta));
  }

  error(service: string, message: string, meta?: $FixMe) {
    console.error(this.formatMessage("error", service, message, meta));
  }
}

export const logger = Logger.getInstance();
