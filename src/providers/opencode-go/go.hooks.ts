import type { PluginInput, Config } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import type { Logger } from "@/lib/core/logger";
import { mergeQuotaCache } from "@/lib/budget/cache";
import type { ProviderClient } from "@/lib/provider/types";
import { resolveGoCredentials, getSetupInstructions } from "./go.auth";
import { openGoDashboard, validateGoCredentials } from "@/lib/setup/go-setup";
import { writeGoConfigToConfigFile } from "./config-writer";
import type { OpenCodeGoAdapter } from "./go";

const z = tool.schema;

const POLL_INTERVAL_MS = 15_000;

export interface GoHooksResult {
  tools: Record<string, ReturnType<typeof tool>>;
  config: (cfg: Config) => Promise<void>;
  polling: { dispose: () => Promise<void> };
}

/**
 * Create all Go-specific hooks: tools, config (slash commands), and polling loop.
 * Keeps index.ts thin — the provider package owns its entire surface.
 */
export function createGoHooks(
  adapter: OpenCodeGoAdapter,
  ctx: PluginInput,
  logger: Logger,
): GoHooksResult {
  const { client } = ctx;

  const tools = {
    debug_quota: buildDebugQuotaTool(adapter, logger),
    setup_go: buildSetupGoTool(client, logger),
  };

  const config = async (cfg: Config) => {
    cfg.command = cfg.command ?? {};
    cfg.command["debug_quota"] = {
      template: "Run the debug_quota tool and show me the results",
      description: "Debug Go auth state and quota data",
    };
    cfg.command["setup_go"] = {
      template: "Run the setup_go tool to help me configure OpenCode Go credentials",
      description: "Set up OpenCode Go credentials",
    };
  };

  const polling = createQuotaPolling(adapter, logger);

  return { tools, config, polling };
}

function buildDebugQuotaTool(
  adapter: OpenCodeGoAdapter,
  logger: Logger,
): ReturnType<typeof tool> {
  return tool({
    description: "Debug — shows Go auth state and quota data for troubleshooting.",
    args: {},
    execute: async () => {
      const creds = await resolveGoCredentials();

      const client = adapter as ProviderClient;
      const result = await client.fetchProviderApi("/rate-limit");
      await logger.debug(`debug_quota: attempted=${result.attempted} error=${result.error ?? "null"}`);

      return {
        title: "Budget Maxxer — Debug",
        output: [
          `**Auth cookie:** ${creds?.authCookie ? "set (masked)" : "not set"}`,
          `**Workspace ID:** ${creds?.workspaceId ?? "(not found)"}`,
          "",
          !creds ? getSetupInstructions() : "",
          "**Quota fetch result:**",
          "```json",
          JSON.stringify(result, null, 2),
          "```",
        ].filter(Boolean).join("\n"),
      };
    },
  });
}

function buildSetupGoTool(
  client: PluginInput["client"],
  logger: Logger,
): ReturnType<typeof tool> {
  return tool({
    description: "Set up OpenCode Go credentials — opens dashboard, validates cookie, writes to config.",
    args: {
      workspaceId: z.string().optional().describe("Workspace ID from the Go dashboard URL (e.g. wrk_xxxxxxxx). Omit to just open dashboard."),
      authCookie: z.string().optional().describe("Browser auth cookie value (starts with Fe26.2**). Omit to just open dashboard."),
    },
    execute: async ({ workspaceId, authCookie }) => {
      if (workspaceId && authCookie) {
        const validation = await validateGoCredentials(workspaceId, authCookie);
        if (validation.valid) {
          const writeResult = await writeGoConfigToConfigFile(workspaceId, authCookie);
          if (writeResult.success) {
            await client.tui.showToast({
              body: { title: "Go Setup", message: `✅ Config written to ${writeResult.path}`, variant: "success" },
            });
            return {
              title: "Budget Maxxer — Go Setup",
              output: [
                `✅ Credentials validated! Windows: ${validation.windows.join(", ")}`,
                `✅ Config written to: ${writeResult.path}`,
                "",
                "Note: authCookie is stored as `{env:OPENCODE_GO_AUTH_COOKIE}` in config.",
                "Set the env var in your shell or .envrc:",
                `  export OPENCODE_GO_AUTH_COOKIE="${authCookie.slice(0, 20)}..."`,
                "",
                "Restart opencode to pick up the new config.",
              ].join("\n"),
            };
          }
          return {
            title: "Budget Maxxer — Go Setup",
            output: `❌ Failed to write config: ${writeResult.error}`,
          };
        }
        return {
          title: "Budget Maxxer — Go Setup",
          output: `❌ Credentials invalid: ${validation.error}\n\n${getSetupInstructions()}`,
        };
      }

      const opened = await openGoDashboard();
      const lines: string[] = [
        "## OpenCode Go Credential Setup",
        "",
        opened.opened ? `✅ Opened Go dashboard in browser: ${opened.url}` : `Open manually: ${opened.url}`,
        "",
        getSetupInstructions(),
      ];

      await client.tui.showToast({
        body: { title: "Go Setup", message: "Dashboard opened — follow instructions to get credentials", variant: "info" },
      });

      return {
        title: "Budget Maxxer — Go Setup",
        output: lines.join("\n"),
      };
    },
  });
}

function createQuotaPolling(
  adapter: OpenCodeGoAdapter,
  logger: Logger,
): { dispose: () => Promise<void> } {
  async function pollQuotaData(): Promise<void> {
    const client = adapter as ProviderClient;
    const result = await client.fetchProviderApi("/rate-limit");

    if (result.attempted && result.data) {
      mergeQuotaCache("opencode-go", result.data as Record<string, unknown>);
      await logger.debug(`Go quota cached: ${JSON.stringify(result.data)}`);
    } else {
      await logger.debug(`Go quota not cached: attempted=${result.attempted} error=${result.error ?? "null"}`);
    }
  }

  pollQuotaData();
  const interval = setInterval(pollQuotaData, POLL_INTERVAL_MS);

  return {
    dispose: async () => {
      clearInterval(interval);
    },
  };
}
