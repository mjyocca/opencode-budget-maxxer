/**
 * Add custom tools to opencode.
 *
 * Uses the tool() helper with a Zod schema for argument validation.
 * Custom tools are available alongside built-in tools.
 *
 * @see https://opencode.ai/docs/plugins/#custom-tools
 */
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

export const CustomToolsPlugin: Plugin = async () => {
  return {
    tool: {
      mytool: tool({
        description: "This is a custom tool",
        args: {
          foo: tool.schema.string(),
        },
        async execute(args, context) {
          const { directory, worktree } = context
          return `Hello ${args.foo} from ${directory} (worktree: ${worktree})`
        },
      }),
    },
  }
}
