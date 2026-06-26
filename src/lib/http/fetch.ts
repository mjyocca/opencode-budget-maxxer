import { withTimeout } from "../core/timeout";
import { HttpError } from "./errors";

/**
 * Fetch with timeout using the existing withTimeout primitive.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return withTimeout(
    fetch(url, options),
    timeoutMs,
    `Request to ${url} timed out after ${timeoutMs}ms`,
  );
}

/**
 * Retry wrapper - compose over fetchWithTimeout for providers that need it.
 * Exponential backoff with jitter. Only retries on network errors or 429/5xx.
 */
export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

export async function fetchWithRetry(
  fn: () => Promise<Response>,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    attempts = 3,
    baseDelayMs = 200,
    shouldRetry: shouldRetryFn = defaultShouldRetry,
  } = options;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fn();
      if (!res.ok) {
        const httpErr = new HttpError(res.status, "", res.url);
        if (shouldRetryFn(httpErr)) {
          lastErr = httpErr;
          await delay(baseDelayMs * 2 ** i);
          continue;
        }
        return res;
      }
      return res;
    } catch (err) {
      if (!shouldRetryFn(err)) throw err;
      lastErr = err;
      await delay(baseDelayMs * 2 ** i);
    }
  }
  throw lastErr;
}

/**
 * Fetch JSON - convenience wrapper that throws HttpError on non-2xx.
 * Use this in provider api files to keep them clean.
 */
export async function fetchJson<T>(
  url: string,
  options: RequestInit,
  timeoutMs = 5000,
): Promise<T> {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  if (!res.ok) {
    throw new HttpError(res.status, await res.text(), url);
  }
  return res.json() as Promise<T>;
}

function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return err instanceof TypeError; // network error
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
