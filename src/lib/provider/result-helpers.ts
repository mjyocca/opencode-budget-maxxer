import type { ProviderResult } from "./types";

/**
 * Provider had no credentials or config - skip silently.
 * Use when isAvailable() would return false.
 */
export function notAttempted<T = unknown>(): ProviderResult<T> {
  return { attempted: false, data: null, error: null };
}

/**
 * Provider fetch succeeded.
 */
export function succeeded<T>(data: T): ProviderResult<T> {
  return { attempted: true, data, error: null };
}

/**
 * Provider was attempted but failed.
 */
export function failed<T = unknown>(error: string): ProviderResult<T> {
  return { attempted: true, data: null, error };
}

/**
 * Wrap a nullable fetch in the standard result shape.
 * Eliminates the try/catch + null-check boilerplate in every provider.
 *
 * - fn returns null -> notAttempted (no credentials found)
 * - fn throws       -> failed(errorLabel + message)
 * - fn returns data -> succeeded(data)
 */
export async function tryFetch<T>(
  fn: () => Promise<T | null>,
  errorLabel: string,
): Promise<ProviderResult<T>> {
  try {
    const data = await fn();
    if (data === null) return notAttempted();
    return succeeded(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return failed(`${errorLabel}: ${msg}`);
  }
}
