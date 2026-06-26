/**
 * timeout.ts - Promise timeout wrapper
 *
 * Wrap any promise with a timeout. Throws a typed TimeoutError with
 * timeoutMs property. Timer is properly cleaned up.
 */

export class TimeoutError extends Error {
  override name = "TimeoutError";
  timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.timeoutMs = timeoutMs;
    this.message = message;
    Error.captureStackTrace?.(this, TimeoutError);
  }
}

/**
 * Wrap a promise with a timeout.
 *
 * @param promise   - the promise to wrap
 * @param ms        - timeout in milliseconds
 * @param message   - optional error message
 * @returns the promise result if it resolves before timeout
 * @throws TimeoutError if the promise does not resolve before the timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  if (ms <= 0) {
    throw new TimeoutError(message ?? "Timeout of 0ms", 0);
  }

  let resolved = false;
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(message ?? "Timed out after " + ms + "ms", ms));
    }, ms);

    promise.finally(() => {
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
      }
    });
  });

  return Promise.race([promise, timeoutPromise]) as Promise<T>;
}
