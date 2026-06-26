export interface AuthData {
  // Add provider auth entries as needed:
  // [providerId: string]: ProviderAuthEntry
  [providerId: string]: ProviderAuthEntry | undefined;
}

/**
 * Generic auth entry - covers the common shapes opencode writes.
 * Extend for provider-specific fields in each provider's own types file.
 */
export interface ProviderAuthEntry {
  type: string; // 'api' | 'oauth' | 'bearer'
  key?: string; // API key (type: 'api')
  access?: string; // Access token (type: 'oauth' | 'bearer')
  refresh?: string; // Refresh token
  expires?: number; // Expiry timestamp (ms)
  [key: string]: unknown;
}

/**
 * Resolved credential for use in adapter.loadAuth().
 * Source tells the adapter where the credential came from for logging.
 */
export interface ProviderCredential {
  value: string;
  source: "env" | "config" | "auth";
}
