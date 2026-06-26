/**
 * Send notifications when certain events occur.
 *
 * Uses osascript to display a macOS notification when a session goes idle.
 *
 * @see https://opencode.ai/docs/plugins/#send-notifications
 */
import type { Plugin } from "@opencode-ai/plugin"

export const NotificationPlugin: Plugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`osascript -e 'display notification "Session completed!" with title "opencode"'`
      }
    },
  }
}
