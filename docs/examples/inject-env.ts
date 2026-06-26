/**
 * Inject environment variables into all shell execution.
 *
 * Applies to both AI tool calls and user terminals.
 *
 * @see https://opencode.ai/docs/plugins/#inject-environment-variables
 */
import type { Plugin } from "@opencode-ai/plugin"

export const InjectEnvPlugin: Plugin = async () => {
  return {
    "shell.env": async (input, output) => {
      output.env.MY_API_KEY = "secret"
      output.env.PROJECT_ROOT = input.cwd
    },
  }
}
