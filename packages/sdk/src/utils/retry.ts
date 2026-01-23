import { isAxiosError } from "axios";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  retryCondition?: (error: unknown) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
  retryCondition: (error: unknown) => {
    // Retry on network errors or 5xx server errors
    if (isAxiosError(error)) {
      if (!error.response) return true; // Network error
      return error.response.status >= 500;
    }
    return true; // Retry on other unknown errors
  },
};

/**
 * Retries an async function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === config.maxRetries || !config.retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(
        config.initialDelay * Math.pow(config.factor, attempt),
        config.maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
