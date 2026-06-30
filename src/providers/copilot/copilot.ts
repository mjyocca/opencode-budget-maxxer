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
import { resolveCopilotToken } from "./copilot.auth";
import { queryCopilotRateLimit } from "./copilot.api";
import type { CopilotRateLimit } from "./copilot.types";

export class CopilotAdapter implements OpenCodeAdapter, ProviderClient {
  readonly id = "copilot";
  readonly displayName = "GitHub Copilot";

  async loadAuth(_ctx: AdapterContext): Promise<AdapterAuth> {
    const token = await resolveCopilotToken();
    if (!token) return {};
    return {
      baseURL: "https://api.githubcopilot.com",
      headers: {
        Authorization: `Bearer ${token}`,
        "Editor-Version": "opencode/1.0",
        "Copilot-Integration-Id": "vscode-chat",
      },
    };
  }

  async prepareRequest(
    _input: Record<string, unknown>,
    output: Record<string, unknown>,
  ): Promise<void> {
    const token = await resolveCopilotToken();
    if (!token) return;
    const options = (output.options as Record<string, unknown>) ?? {};
    output.options = options;
    const headers = (options.headers as Record<string, string>) ?? {};
    options.headers = headers;
    headers["Authorization"] = `Bearer ${token}`;
  }

  async fetchProviderApi<T>(
    path: string,
    opts?: ProviderRequestOptions,
  ): Promise<ProviderResult<T>> {
    if (path === "/rate-limit") {
      return queryCopilotRateLimit({
        timeoutMs: opts?.timeoutMs,
      }) as Promise<ProviderResult<T>>;
    }
    return { attempted: false, data: null, error: `Unknown path: ${path}` };
  }
}
