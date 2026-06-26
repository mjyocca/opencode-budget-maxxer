import { readAuthFileCached } from "./auth-file";
import {
  readFirstConfig,
  getOpencodeConfigCandidatePaths,
} from "../core/config-discovery";
import { resolveEnvTemplate } from "../core/env-template";
import type { ProviderCredential } from "./types";

/**
 * Resolve a credential for a provider using the standard three-source chain:
 *
 *   1. Environment variable(s)  - highest priority
 *   2. opencode config file     - provider.{id}.options.apiKey (supports {env:VAR})
 *   3. auth.json                - written by opencode's /connect command
 *
 * Pass multiple envVars to check aliases (e.g. ['COPILOT_TOKEN', 'GITHUB_TOKEN']).
 * Pass multiple authKeys to check aliases in auth.json (e.g. ['copilot', 'github-copilot']).
 */
export async function resolveCredential(
  providerId: string,
  options: {
    envVars?: string[];
    authKeys?: string[]; // defaults to [providerId]
  } = {},
): Promise<ProviderCredential | null> {
  const { envVars = [], authKeys = [providerId] } = options;

  // 1. Environment variables
  for (const name of envVars) {
    const val = process.env[name];
    if (val?.trim()) return { value: val.trim(), source: "env" };
  }

  // 2. opencode config - resolveEnvTemplate handles {env:VAR} syntax
  const config = readFirstConfig(getOpencodeConfigCandidatePaths());
  if (config?.config) {
    const obj = config.config as Record<string, unknown>;
    const providerConfig = (obj.provider as Record<string, unknown>)?.[
      providerId
    ];
    const raw = (providerConfig as Record<string, unknown>)?.options;
    const apiKey = (raw as Record<string, unknown>)?.apiKey;
    if (typeof apiKey === "string") {
      const resolved = resolveEnvTemplate(apiKey);
      if (resolved) return { value: resolved, source: "config" };
    }
  }

  // 3. auth.json - written by opencode's /connect command
  const auth = await readAuthFileCached();
  if (auth) {
    for (const key of authKeys) {
      const entry = auth[key];
      const value = entry?.key ?? entry?.access;
      if (value) return { value, source: "auth" };
    }
  }

  return null;
}
