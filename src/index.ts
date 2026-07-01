import type { Plugin, PluginInput, PluginOptions } from "@opencode-ai/plugin";
import { createSdkLogger } from "@/lib/core/logger";
import { PLUGIN_ID } from "@/lib/core/constants";
import { AdapterRegistry } from "@/lib/adapter/registry";
import { ExampleAdapter } from "@/providers/example/index";
import { CopilotAdapter } from "@/providers/copilot/copilot";
import { OpenCodeGoAdapter } from "@/providers/opencode-go/go";
import { OpenCodeZenAdapter } from "@/providers/opencode-zen/zen";
import { createGoHooks } from "@/providers/opencode-go/go.hooks";
import { createZenHooks } from "@/providers/opencode-zen/zen.hooks";
import { composeHooks, composePlugin } from "@/lib/hooks/compose";
import { buildChatHeadersHook, buildChatParamsHook } from "./hooks";
import { eventHandler } from "./event-handler.js";

export const PluginServer: Plugin = async (
  ctx: PluginInput,
  _options?: PluginOptions,
) => {
  const { client, project, directory } = ctx;
  const logger = createSdkLogger(client, PLUGIN_ID);

  const registry = new AdapterRegistry(logger);
  registry.register(new ExampleAdapter());
  registry.register(new CopilotAdapter());

  const goAdapter = new OpenCodeGoAdapter();
  registry.register(goAdapter);

  const zenAdapter = new OpenCodeZenAdapter();
  registry.register(zenAdapter);

  const go = createGoHooks(goAdapter, ctx, logger);
  const zen = createZenHooks(zenAdapter, ctx, logger);

  await logger.info(
    `Active — project: ${project ?? "(none)"}, dir: ${directory}`,
  );
  await logger.debug(`Registered adapters: ${registry.ids().join(", ")}`);

  return composePlugin({
    config: async (cfg) => {
      await go.config(cfg);
      await zen.config(cfg);
    },
    hooks: composeHooks(
      buildChatHeadersHook(registry, ctx),
      buildChatParamsHook(registry, ctx),
      {
        dispose: async () => {
          await go.polling.dispose();
          await zen.polling.dispose();
        },
        tool: { ...go.tools, ...zen.tools },
        event: eventHandler(registry, ctx, logger),
      },
    ),
  });
};

export { PluginServer as default };
