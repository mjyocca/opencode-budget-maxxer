/**
 * adapter/types.ts - Adapter types and interfaces
 */

import type { PluginInput } from "@opencode-ai/plugin";

// Re-export for adapters to import from one place
export type { PluginInput };

/**
 * Context passed to adapter methods.
 * Gives adapters access to the plugin ctx and resolved credential.
 */
export interface AdapterContext {
  plugin: PluginInput;
}

/**
 * What loadAuth() must return - opencode uses this for auth.loader.
 */
export interface AdapterAuth {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

/**
 * Minimum contract for opencode plugin integration.
 *
 * Implement this interface to wire a provider into opencode's auth.loader
 * and optionally chat.params hooks.
 *
 * For providers that also need direct API access, additionally implement
 * ProviderClient (in provider/types.ts).
 */
export interface OpenCodeAdapter {
  /** Stable provider ID - matches opencode's provider registry ID */
  readonly id: string;

  /** Display name for logging and TUI */
  readonly displayName: string;

  /**
   * Returns auth credentials for this provider.
   * Called in auth.loader - must be fast (cached reads only).
   */
  loadAuth(ctx: AdapterContext): Promise<AdapterAuth>;

  /**
   * Mutate outgoing request parameters before each inference call.
   * Called in chat.params. Optional - only needed if loadAuth isn't enough
   * (e.g. short-lived tokens that must be refreshed per-request).
   */
  prepareRequest?(
    input: Record<string, unknown>,
    output: Record<string, unknown>,
  ): Promise<void>;
}
