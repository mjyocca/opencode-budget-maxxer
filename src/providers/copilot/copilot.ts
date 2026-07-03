import type {
  Provider,
  ProviderContext,
  ProviderAuth,
  ProviderResult,
  ProviderRequestOptions,
} from "@/lib/provider/types";
import { resolveCopilotToken } from "./copilot.auth";
import { queryCopilotUsage } from "./copilot.api";
import type { CopilotUsage } from "./copilot.types";
import { mergeQuotaCache } from "@/budget-cache";
import { createSdkLogger } from "@/lib/core/logger";

const POLL_INTERVAL_MS = 15_000;

export class CopilotProvider implements Provider {
  readonly id = "copilot";
  readonly displayName = "GitHub Copilot";

  private interval: ReturnType<typeof setInterval> | null = null;

  async isConfigured(): Promise<boolean> {
    const token = await resolveCopilotToken();
    return token !== null;
  }

  async loadAuth(_ctx: ProviderContext): Promise<ProviderAuth> {
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

  async fetchProviderApi<T>(
    path: string,
    opts?: ProviderRequestOptions,
  ): Promise<ProviderResult<T>> {
    if (path === "/usage") {
      return queryCopilotUsage({
        timeoutMs: opts?.timeoutMs,
      }) as Promise<ProviderResult<T>>;
    }
    return { attempted: false, data: null, error: `Unknown path: ${path}` };
  }

  async startup(ctx: ProviderContext): Promise<void> {
    const logger = createSdkLogger(ctx.plugin.client, "copilot-provider");

    const poll = async () => {
      const result = await this.fetchProviderApi<CopilotUsage>("/usage");
      if (result.attempted && result.data) {
        mergeQuotaCache("copilot", result.data as unknown as Record<string, unknown>);
        await logger.debug(`Copilot usage cached: ${JSON.stringify(result.data)}`);
      }
    };

    poll();
    this.interval = setInterval(poll, POLL_INTERVAL_MS);
  }

  async cleanup(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async inspect(_ctx: ProviderContext): Promise<Record<string, unknown>> {
    const token = await resolveCopilotToken();
    const result = await this.fetchProviderApi("/usage");
    return {
      auth: {
        token: token ? "set (masked)" : "not set",
      },
      usage: result,
    };
  }
}
