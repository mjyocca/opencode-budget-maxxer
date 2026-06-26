import type { Plugin, PluginInput, PluginOptions } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { createSdkLogger } from "@/lib/core/logger";
import { PLUGIN_ID } from "@/lib/core/constants";
import { AdapterRegistry } from "@/lib/adapter/registry";
import { ExampleAdapter } from "@/providers/example/index";
import { composeHooks, composePlugin } from "@/lib/hooks/compose";
import { buildChatHeadersHook, buildChatParamsHook } from "./hooks";
import { eventHandler } from "./event-handler.js";

export const PluginServer: Plugin = async (
  ctx: PluginInput,
  _options?: PluginOptions,
) => {
  const { client, project, directory } = ctx;
  const logger = createSdkLogger(client, PLUGIN_ID);

  // Register adapters — add additional adapters here as the plugin grows.
  // AdapterRegistry routes auth.loader and chat.params hooks to the right adapter.
  const registry = new AdapterRegistry(logger);
  registry.register(new ExampleAdapter());

  await logger.info(
    `Active — project: ${project ?? "(none)"}, dir: ${directory}`,
  );
  await logger.debug(`Registered adapters: ${registry.ids().join(", ")}`);

  const helloTool = tool({
    description: "Demo tool — shows that the plugin is loaded and working.",
    args: {},
    execute: async () => {
      return {
        title: "Plugin Kit — Server",
        output: "opencode-plugin-kit server plugin is active.",
      };
    },
  });

  return composePlugin({
    hooks: composeHooks(
      buildChatHeadersHook(registry, ctx),
      buildChatParamsHook(registry, ctx),
      {
        dispose: async () => {
          await logger.info("Disposing");
        },
        tool: {
          hello: helloTool,
        },
        event: eventHandler(registry, ctx, logger),
      },
    ),
  });
};

export { PluginServer as default };
