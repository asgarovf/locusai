import { EventEmitter } from "events";

export enum LocusEvent {
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  AUTH_ERROR = "AUTH_ERROR",
  REQUEST_ERROR = "REQUEST_ERROR",
}

export interface LocusConfig {
  baseUrl: string;
  token?: string | null;
  timeout?: number;
}

export class LocusEmitter extends EventEmitter {
  on(event: LocusEvent.TOKEN_EXPIRED, listener: () => void): this;
  on(event: LocusEvent.AUTH_ERROR, listener: (error: Error) => void): this;
  on(event: LocusEvent.REQUEST_ERROR, listener: (error: Error) => void): this;
  on(
    event: LocusEvent | string,
    listener: ((...args: unknown[]) => void) | (() => void)
  ): this {
    return super.on(event, listener);
  }

  emit(event: LocusEvent.TOKEN_EXPIRED): boolean;
  emit(event: LocusEvent.AUTH_ERROR, error: Error): boolean;
  emit(event: LocusEvent.REQUEST_ERROR, error: Error): boolean;
  emit(event: LocusEvent | string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}
