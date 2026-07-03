import type { Plugin, PluginInput, PluginOptions } from "@opencode-ai/plugin";
import { createSdkLogger } from "@/lib/core/logger";
import { PLUGIN_ID } from "@/lib/core/constants";
import type { ProviderContext } from "@/lib/provider/types";
import { createRegistry } from "@/providers";
import { composePlugin } from "@/lib/hooks/compose";

export const PluginServer: Plugin = async (
  ctx: PluginInput,
  _options?: PluginOptions,
) => {
  const { client, project, directory } = ctx;
  const logger = createSdkLogger(client, PLUGIN_ID);

  const providerCtx: ProviderContext = { plugin: ctx };
  const registry = await createRegistry(logger, providerCtx);

  await logger.info(
    `Active — project: ${project ?? "(none)"}, dir: ${directory}`,
  );
  await logger.debug(`Registered providers: ${registry.ids().join(", ")}`);

  return composePlugin({
    hooks: {
      dispose: () => registry.cleanupAll(),
    },
  });
};

export { PluginServer as default };
