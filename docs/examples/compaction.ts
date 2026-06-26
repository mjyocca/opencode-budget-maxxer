/**
 * Customize the context included when a session is compacted.
 *
 * The experimental.session.compacting hook fires before the LLM generates
 * a continuation summary. Use output.context.push() to inject domain-specific
 * context that the default compaction prompt would miss.
 *
 * @see https://opencode.ai/docs/plugins/#compaction-hooks
 */
import type { Plugin } from "@opencode-ai/plugin"

export const CompactionPlugin: Plugin = async () => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`## Custom Context

Include any state that should persist across compaction:
- Current task status
- Important decisions made
- Files being actively worked on`)
    },
  }
}
