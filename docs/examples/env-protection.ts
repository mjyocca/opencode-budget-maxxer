/**
 * Prevent opencode from reading .env files.
 *
 * Intercepts the read tool before execution and throws an error
 * if the file path includes ".env".
 *
 * @see https://opencode.ai/docs/plugins/#env-protection
 */
import type { Plugin } from "@opencode-ai/plugin"

export const EnvProtectionPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read" && output.args.filePath.includes(".env")) {
        throw new Error("Do not read .env files")
      }
    },
  }
}
