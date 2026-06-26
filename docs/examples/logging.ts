/**
 * Use client.app.log() instead of console.log for structured logging.
 *
 * Levels: debug, info, warn, error.
 *
 * @see https://opencode.ai/docs/plugins/#logging
 */
import type { Plugin } from "@opencode-ai/plugin"

export const LoggingPlugin: Plugin = async ({ client }) => {
  await client.app.log({
    body: {
      service: "my-plugin",
      level: "info",
      message: "Plugin initialized",
      extra: { foo: "bar" },
    },
  })

  return {}
}
