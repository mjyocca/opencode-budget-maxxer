import type {
  Provider,
  ProviderContext,
  ProviderAuth,
  ProviderResult,
  ProviderRequestOptions,
  TuiCommand,
} from "@/lib/provider/types";
import { resolveZenCredentials } from "./zen.auth";
import { queryZenUsage } from "./zen.api";
import type { ZenUsage } from "./zen.types";
import { mergeQuotaCache } from "@/cache";
import { createSdkLogger } from "@/lib/core/logger";
import { openZenDashboard } from "@/lib/setup/zen-setup";

const POLL_INTERVAL_MS = 15_000;

export class OpencodeZenProvider implements Provider {
  readonly id = "opencode";
  readonly displayName = "OpenCode Zen";

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
        const result = await openZenDashboard();
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
    const creds = await resolveZenCredentials();
    return creds !== null;
  }

  async loadAuth(_ctx: ProviderContext): Promise<ProviderAuth> {
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

  async startup(ctx: ProviderContext): Promise<void> {
    const logger = createSdkLogger(ctx.plugin.client, "zen-provider");

    const poll = async () => {
      const result = await this.fetchProviderApi<ZenUsage>("/usage");
      if (result.attempted && result.data) {
        mergeQuotaCache(
          "opencode",
          result.data as unknown as Record<string, unknown>,
        );
        await logger.debug(`Zen usage cached: ${JSON.stringify(result.data)}`);
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
    const creds = await resolveZenCredentials();
    const result = await this.fetchProviderApi("/usage");
    return {
      auth: {
        cookie: creds?.authCookie ? "set (masked)" : "not set",
        workspaceId: creds?.workspaceId ?? "(not found)",
      },
      usage: result,
    };
  }
}
