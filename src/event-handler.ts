import { Logger } from "@/lib/index.js";
import { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import type { AdapterRegistry } from "@/lib/index";

// Example individual event handler that receives adapter registry and plugin input as context for current execution
export const eventHandler = (
  registry: AdapterRegistry,
  ctx: PluginInput,
  logger: Logger,
) => {
  return async ({ event }: { event: Event }): Promise<void> => {
    await logger.debug(`[EVENT] ${event.type}`);

    switch (event.type) {
      case "session.created":
        await logger.debug(`session.created — id: ${event.properties.info.id}`);
        break;

      case "message.updated":
        await logger.debug(
          `message.updated — session: ${event.properties.info.sessionID}`,
        );
        break;

      case "file.edited":
        await logger.debug(`file.edited — file: ${event.properties.file}`);
        break;

      default:
        await logger.debug(`event: ${event.type}`);
    }
  };
};
