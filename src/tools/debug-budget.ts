import { tool } from "@opencode-ai/plugin";
import type { ProviderRegistry } from "@/lib/provider/registry";
import type { ProviderContext } from "@/lib/provider/types";
import type { PluginInput } from "@opencode-ai/plugin";

export function buildDebugBudgetTool(registry: ProviderRegistry, ctx: PluginInput) {
  return tool({
    description: "Debug — shows auth state and quota/usage data for all providers.",
    args: {},
    execute: async () => {
      const providerCtx: ProviderContext = { plugin: ctx };
      const results: Record<string, unknown> = {};

      for (const provider of registry.allRegistered()) {
        if (provider.inspect) {
          results[provider.id] = await provider.inspect(providerCtx);
        }
      }

      return {
        title: "Budget Maxxer — Debug Budget",
        output: ["```json", JSON.stringify(results, null, 2), "```"].join("\n"),
      };
    },
  });
}
