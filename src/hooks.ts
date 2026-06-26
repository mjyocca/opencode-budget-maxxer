/**
 * hooks.ts - Registry-wired hook builders for this plugin
 *
 * Uses defineHook() from lib/hooks/build.ts to write correctly-typed
 * Partial<Hooks> without SDK type boilerplate.
 *
 * Copy this pattern to build hook builders for your own providers.
 */

import type { PluginInput } from "@opencode-ai/plugin";
import { defineHook } from "@/lib/hooks/build";
import { Mutex } from "@/lib/core/mutex";
import { createSdkLogger } from "@/lib/core/logger";
import type { AdapterRegistry } from "@/lib/adapter/registry";
import type { AdapterContext } from "@/lib/adapter/types";

// One mutex per plugin instance — serializes concurrent token refreshes
// across all adapters registered in the registry.
const requestMutex = new Mutex();

/**
 * Injects auth credentials into every outgoing request via chat.headers.
 * Routes to the adapter matching the active provider ID.
 *
 * Use this for API key or bearer token injection (the common case).
 * For adapters that need per-request parameter mutation beyond headers,
 * also wire in buildChatParamsHook.
 */
export function buildChatHeadersHook(
  registry: AdapterRegistry,
  ctx: PluginInput,
) {
  const logger = createSdkLogger(ctx.client, "adapter-hooks");
  const adapterCtx: AdapterContext = { plugin: ctx };

  return defineHook("chat.headers", async (input, output) => {
    const providerId = input.provider?.info?.id;
    if (!providerId) return;

    const adapter = registry.get(providerId);
    if (!adapter) return;

    await requestMutex.runExclusive(async () => {
      try {
        const auth = await adapter.loadAuth(adapterCtx);
        if (auth.apiKey) {
          output.headers["Authorization"] = `Bearer ${auth.apiKey}`;
        }
        if (auth.headers) {
          Object.assign(output.headers, auth.headers);
        }
      } catch (err) {
        await logger.warn(
          `loadAuth failed for ${providerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  });
}

/**
 * Routes prepareRequest() calls to the matching adapter via chat.params.
 * Use this for adapters with short-lived tokens that need per-request refresh.
 *
 * Most adapters only need buildChatHeadersHook. Add this when your adapter
 * implements prepareRequest() for finer-grained control over request params.
 */
export function buildChatParamsHook(
  registry: AdapterRegistry,
  ctx: PluginInput,
) {
  const logger = createSdkLogger(ctx.client, "adapter-hooks");
  const adapterCtx: AdapterContext = { plugin: ctx };

  return defineHook("chat.params", async (input, output) => {
    const providerId = input.provider?.info?.id;
    if (!providerId) return;

    const adapter = registry.get(providerId);
    if (!adapter?.prepareRequest) return;

    await requestMutex.runExclusive(async () => {
      try {
        await adapter.prepareRequest!(
          input as unknown as Record<string, unknown>,
          output as unknown as Record<string, unknown>,
        );
      } catch (err) {
        await logger.warn(
          `prepareRequest failed for ${providerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  });
}
