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
import { resolveGoToken } from "./go.auth";
import { queryGoRateLimit } from "./go.api";

export class OpenCodeGoAdapter implements OpenCodeAdapter, ProviderClient {
  readonly id = "opencode-go";
  readonly displayName = "OpenCode Go";

  async loadAuth(_ctx: AdapterContext): Promise<AdapterAuth> {
    const token = await resolveGoToken();
    if (!token) return {};
    return {
      apiKey: token,
      baseURL: "https://go.opencode.ai/api/v1",
    };
  }

  async fetchProviderApi<T>(
    path: string,
    opts?: ProviderRequestOptions,
  ): Promise<ProviderResult<T>> {
    if (path === "/rate-limit") {
      return queryGoRateLimit({
        timeoutMs: opts?.timeoutMs,
      }) as Promise<ProviderResult<T>>;
    }
    return { attempted: false, data: null, error: `Unknown path: ${path}` };
  }
}
