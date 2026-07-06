import type {
  Provider,
  ProviderContext,
  ProviderAuth,
  ProviderResult,
  ProviderRequestOptions,
  TuiCommand,
} from "@/lib/provider/types";
import { resolveGoCredentials } from "./go.auth";
import { queryGoRateLimit } from "./go.api";
import type { GoRateLimit } from "./go.types";
import { mergeQuotaCache } from "@/cache";
import { createSdkLogger } from "@/lib/core/logger";
import { openGoDashboard } from "@/lib/setup/go-setup";

const POLL_INTERVAL_MS = 15_000;

export class OpencodeGoProvider implements Provider {
  readonly id = "opencode-go";
  readonly displayName = "OpenCode Go";

  private interval: ReturnType<typeof setInterval> | null = null;

  setupCommand(api: any): TuiCommand | null {
    return {
      namespace: "palette",
      name: `budget-maxxer.setup-${this.id}`,
      title: `Setup ${this.displayName}`,
      desc: `Open dashboard and get instructions for ${this.displayName} credential setup`,
      category: "Budget Maxxer",
      slashName: `budget:setup_${this.id.replace(/-/g, "_")}`,
      run: async () => {
        const result = await openGoDashboard();
        const message = result.opened
          ? `Opened ${this.displayName} dashboard — check browser for instructions`
          : `Open ${this.displayName} dashboard manually: ${result.url}`;
        api.ui.toast?.({
          message,
          variant: result.opened ? "info" : "warning",
        });
      },
    };
  }

  async isConfigured(): Promise<boolean> {
    const creds = await resolveGoCredentials();
    return creds !== null;
  }

  async loadAuth(_ctx: ProviderContext): Promise<ProviderAuth> {
    const creds = await resolveGoCredentials();
    if (!creds) return {};
    return {
      apiKey: creds.authCookie,
      baseURL: `https://opencode.ai/workspace/${creds.workspaceId}/go`,
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

  async startup(ctx: ProviderContext): Promise<void> {
    const logger = createSdkLogger(ctx.plugin.client, "go-provider");

    const poll = async () => {
      const result = await this.fetchProviderApi<GoRateLimit>("/rate-limit");
      if (result.attempted && result.data) {
        await mergeQuotaCache(
          "opencode-go",
          result.data as unknown as Record<string, unknown>,
        );
        await logger.debug(`Go quota cached: ${JSON.stringify(result.data)}`);
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
    const creds = await resolveGoCredentials();
    const result = await this.fetchProviderApi("/rate-limit");
    return {
      auth: {
        cookie: creds?.authCookie ? "set (masked)" : "not set",
        workspaceId: creds?.workspaceId ?? "(not found)",
      },
      quota: result,
    };
  }
}
