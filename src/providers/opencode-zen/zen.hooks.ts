import type { PluginInput, Config } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import type { Logger } from "@/lib/core/logger";
import { mergeQuotaCache, readCache } from "@/lib/budget/cache";
import type { ProviderClient } from "@/lib/provider/types";
import { resolveZenCredentials, getSetupInstructions } from "./zen.auth";
import {
  openZenDashboard,
  validateZenCredentials,
} from "@/lib/setup/zen-setup";
import { writeZenConfigToConfigFile } from "./config-writer";
import type { OpenCodeZenAdapter } from "./zen";

const z = tool.schema;

const POLL_INTERVAL_MS = 15_000;

export interface ZenHooksResult {
  tools: Record<string, ReturnType<typeof tool>>;
  config: (cfg: Config) => Promise<void>;
  polling: { dispose: () => Promise<void> };
}

export function createZenHooks(
  adapter: OpenCodeZenAdapter,
  ctx: PluginInput,
  logger: Logger,
): ZenHooksResult {
  const { client } = ctx;

  const tools = {
    debug_zen: buildDebugZenTool(adapter, logger),
    setup_zen: buildSetupZenTool(client, logger),
    debug_budget: buildDebugBudgetTool(client, logger),
  };

  const config = async (cfg: Config) => {
    cfg.command = cfg.command ?? {};
    cfg.command["debug_zen"] = {
      template: "Run the debug_zen tool and show me the results",
      description: "Debug Zen auth state and usage data",
    };
    cfg.command["setup_zen"] = {
      template:
        "Run the setup_zen tool to help me configure OpenCode Zen credentials",
      description: "Set up OpenCode Zen credentials",
    };
    cfg.command["debug_budget"] = {
      template: "Run the debug_budget tool to show cache and provider state",
      description: "Debug budget cache and provider state",
    };
  };

  const polling = createUsagePolling(adapter, logger);

  return { tools, config, polling };
}

function buildDebugZenTool(
  adapter: OpenCodeZenAdapter,
  logger: Logger,
): ReturnType<typeof tool> {
  return tool({
    description:
      "Debug — shows Zen auth state and usage data for troubleshooting.",
    args: {},
    execute: async () => {
      const creds = await resolveZenCredentials();

      const client = adapter as ProviderClient;
      const result = await client.fetchProviderApi("/usage");
      await logger.debug(
        `debug_zen: attempted=${result.attempted} error=${result.error ?? "null"}`,
      );

      return {
        title: "Budget Maxxer — Zen Debug",
        output: [
          `**Auth cookie:** ${creds?.authCookie ? "set (masked)" : "not set"}`,
          `**Workspace ID:** ${creds?.workspaceId ?? "(not found)"}`,
          "",
          !creds ? getSetupInstructions() : "",
          "**Usage fetch result:**",
          "```json",
          JSON.stringify(result, null, 2),
          "```",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    },
  });
}

function buildSetupZenTool(
  client: PluginInput["client"],
  logger: Logger,
): ReturnType<typeof tool> {
  return tool({
    description:
      "Set up OpenCode Zen credentials — opens dashboard, validates cookie, writes to config.",
    args: {
      workspaceId: z
        .string()
        .optional()
        .describe(
          "Workspace ID from the Zen dashboard URL (e.g. wrk_xxxxxxxx). Omit to just open dashboard.",
        ),
      authCookie: z
        .string()
        .optional()
        .describe(
          "Browser auth cookie value (starts with Fe26.2**). Omit to just open dashboard.",
        ),
    },
    execute: async ({ workspaceId, authCookie }) => {
      if (workspaceId && authCookie) {
        const validation = await validateZenCredentials(
          workspaceId,
          authCookie,
        );
        if (validation.valid) {
          const writeResult = await writeZenConfigToConfigFile(
            workspaceId,
            authCookie,
          );
          if (writeResult.success) {
            await client.tui.showToast({
              body: {
                title: "Zen Setup",
                message: `✅ Config written to ${writeResult.path}`,
                variant: "success",
              },
            });
            return {
              title: "Budget Maxxer — Zen Setup",
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
            title: "Budget Maxxer — Zen Setup",
            output: `❌ Failed to write config: ${writeResult.error}`,
          };
        }
        return {
          title: "Budget Maxxer — Zen Setup",
          output: `❌ Credentials invalid: ${validation.error}\n\n${getSetupInstructions()}`,
        };
      }

      const opened = await openZenDashboard();
      const lines: string[] = [
        "## OpenCode Zen Credential Setup",
        "",
        opened.opened
          ? `✅ Opened Zen dashboard in browser: ${opened.url}`
          : `Open manually: ${opened.url}`,
        "",
        getSetupInstructions(),
      ];

      await client.tui.showToast({
        body: {
          title: "Zen Setup",
          message: "Dashboard opened — follow instructions to get credentials",
          variant: "info",
        },
      });

      return {
        title: "Budget Maxxer — Zen Setup",
        output: lines.join("\n"),
      };
    },
  });
}

function createUsagePolling(
  adapter: OpenCodeZenAdapter,
  logger: Logger,
): { dispose: () => Promise<void> } {
  async function pollUsageData(): Promise<void> {
    const client = adapter as ProviderClient;
    const result = await client.fetchProviderApi("/usage");

    if (result.attempted && result.data) {
      mergeQuotaCache("opencode", result.data as Record<string, unknown>);
      await logger.debug(`Zen usage cached: ${JSON.stringify(result.data)}`);
    } else {
      await logger.debug(
        `Zen usage not cached: attempted=${result.attempted} error=${result.error ?? "null"}`,
      );
    }
  }

  pollUsageData();
  const interval = setInterval(pollUsageData, POLL_INTERVAL_MS);

  return {
    dispose: async () => {
      clearInterval(interval);
    },
  };
}

function buildDebugBudgetTool(
  client: PluginInput["client"],
  logger: Logger,
): ReturnType<typeof tool> {
  return tool({
    description:
      "Debug — shows Go auth state and quota data for troubleshooting.",
    args: {},
    execute: async () => {
      const cache = readCache();
      const goCreds = await resolveZenCredentials();

      await logger.debug(
        `debug_budget: cache entries=${cache?.entries?.length ?? 0}`,
      );

      return {
        title: "Budget Maxxer — Debug Budget",
        output: [
          `**Cache entries:** ${cache?.entries?.length ?? 0}`,
          `**Last updated:** ${cache?.updatedAt ?? "never"}`,
          "",
          "**Cache content:**",
          "```json",
          JSON.stringify(cache ?? {}, null, 2),
          "```",
          "",
          "**Zen auth state:**",
          `- Auth cookie: ${goCreds?.authCookie ? "set (masked)" : "not set"}`,
          `- Workspace ID: ${goCreds?.workspaceId ?? "(not found)"}`,
        ].join("\n"),
      };
    },
  });
}
