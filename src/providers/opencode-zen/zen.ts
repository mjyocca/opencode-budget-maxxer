import type {
  OpenCodeAdapter,
  AdapterContext,
  AdapterAuth,
} from "@/lib/adapter/types";
import type {
  ProviderClient,
  ProviderResult,
  ProviderRequestOptions,
} from "@/lib/provider/types";
import { resolveZenCredentials } from "./zen.auth";
import { queryZenUsage } from "./zen.api";

export class OpenCodeZenAdapter implements OpenCodeAdapter, ProviderClient {
  readonly id = "opencode";
  readonly displayName = "OpenCode Zen";

  async loadAuth(_ctx: AdapterContext): Promise<AdapterAuth> {
    const creds = await resolveZenCredentials();
    if (!creds) return {};
    return {
      apiKey: creds.authCookie,
      baseURL: `https://opencode.ai/workspace/${creds.workspaceId}/zen`,
    };
  }

  async fetchProviderApi<T>(
    path: string,
    opts?: ProviderRequestOptions,
  ): Promise<ProviderResult<T>> {
    if (path === "/usage") {
      return queryZenUsage({
        timeoutMs: opts?.timeoutMs,
      }) as Promise<ProviderResult<T>>;
    }
    return { attempted: false, data: null, error: `Unknown path: ${path}` };
  }
}
