import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { resolveEditableConfigPath, readFirstConfig, getOpencodeGlobalConfigPaths } from "@/lib/core/config-discovery";
import { stringifyJsonc, stripJsonc } from "@/lib/core/jsonc";

/**
 * Deep-merge a provider's options into the first editable opencode config file.
 *
 * Preserves all existing config sections and existing provider options — only
 * adds/overwrites the keys in `partialOptions`.
 *
 * @example
 * await mergeProviderConfig("opencode-go", {
 *   workspaceId: "wrk_xxx",
 *   authCookie: "{env:OPENCODE_GO_AUTH_COOKIE}",
 * });
 */
export async function mergeProviderConfig(
  providerId: string,
  partialOptions: Record<string, unknown>,
): Promise<{ success: boolean; path: string; error?: string }> {
  let targetPath = resolveEditableConfigPath();

  if (!targetPath) {
    const globalPaths = getOpencodeGlobalConfigPaths();
    const existing = readFirstConfig(globalPaths);
    if (existing) {
      targetPath = existing.path;
    } else {
      const home = process.env.HOME ?? process.env.USERPROFILE;
      if (!home) {
        return { success: false, path: "", error: "Cannot determine config directory — HOME not set." };
      }
      targetPath = `${home}/.config/opencode/opencode.jsonc`;
    }
  }

  let config: Record<string, unknown> = {};
  try {
    const content = readFileSync(targetPath, "utf-8");
    config = JSON.parse(stripJsonc(content)) as Record<string, unknown>;
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  const providerSection = (config.provider as Record<string, unknown>) ?? {};
  const existingProvider = (providerSection[providerId] as Record<string, unknown>) ?? {};
  const existingOpts = (existingProvider.options as Record<string, unknown>) ?? {};

  providerSection[providerId] = {
    ...existingProvider,
    options: { ...existingOpts, ...partialOptions },
  };
  config.provider = providerSection;

  try {
    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(targetPath, stringifyJsonc(config), "utf-8");
    return { success: true, path: targetPath };
  } catch (err) {
    return {
      success: false,
      path: targetPath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Convenience wrapper for OpenCode Go provider config.
 * Writes workspaceId and env-templated authCookie into the provider section.
 */
export async function writeGoConfigToConfigFile(
  workspaceId: string,
  authCookie: string,
): Promise<{ success: boolean; path: string; error?: string }> {
  return mergeProviderConfig("opencode-go", {
    workspaceId,
    authCookie: `{env:OPENCODE_GO_AUTH_COOKIE}`,
  });
}
