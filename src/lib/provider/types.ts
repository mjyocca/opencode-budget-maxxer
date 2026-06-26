/**
 * Normalized result from any provider data fetch.
 *
 * The `attempted` flag is the key discriminator:
 *   - false -> provider had no credentials/config, skip silently
 *   - true  -> provider was attempted; check `error` for failure
 *
 * Phase 3 builds on this type for quota/limit results.
 */
export interface ProviderResult<T = unknown> {
  attempted: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Options for direct provider API requests.
 */
export interface ProviderRequestOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Contract for adapters that can make direct provider API calls.
 * Separate from OpenCodeAdapter - not every provider exposes an API.
 *
 * Implement this alongside OpenCodeAdapter for full adapter capability.
 * Use isProviderClient() guard from adapter/registry.ts to check at runtime.
 */
export interface ProviderClient {
  readonly id: string;
  fetchProviderApi<T>(
    path: string,
    options?: ProviderRequestOptions
  ): Promise<ProviderResult<T>>;
}
