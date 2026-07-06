import type { Plugin, PluginInput, PluginOptions } from "@opencode-ai/plugin";
import { createSdkLogger } from "@/lib/core/logger";
import { PLUGIN_ID } from "@/lib/core/constants";
import type { ProviderContext } from "@/lib/provider/types";
import { createRegistry } from "@/providers";
import { composePlugin, composeHooks } from "@/lib/hooks/compose";
import { defineHook } from "@/lib/hooks/build";
import { mapProviderID, setSessionActiveProvider } from "@/cache";

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
    hooks: composeHooks(
      { dispose: () => registry.cleanupAll() },
      defineHook("chat.headers", async (input, _output) => {
        const opencodeProviderID = input.provider?.info?.id;
        const mappedID = mapProviderID(opencodeProviderID);
        if (mappedID) {
          await setSessionActiveProvider(input.sessionID, mappedID);
          await logger.debug(
            `Tracked active provider for session ${input.sessionID}: ${mappedID}`,
          );
        } else {
          await logger.debug(
            `Unknown provider ID from opencode config: ${opencodeProviderID}`,
          );
        }
      }),
    ),
  });
};

export { PluginServer as default };
