/** @jsxImportSource @opentui/solid */

/**
 * EXAMPLE A: Augment the session prompt with additional UI
 *
 * This pattern demonstrates how to:
 * - Add status information below the prompt
 * - Show contextual hints, warnings, or usage info
 * - Maintain full prompt functionality while extending the UI
 *
 * Key points:
 * - Renders the original <api.ui.Prompt> component with all props forwarded
 * - The `ref` prop MUST be forwarded for proper prompt functionality
 * - Wraps the prompt with additional UI (status line below in this example)
 * - Use this when you want to ADD to the prompt, not replace it
 *
 * To enable this example:
 * 1. Uncomment the import in src/tui.tsx
 * 2. Uncomment the session_prompt registration block for Example A
 * 3. Rebuild and restart opencode
 *
 * Configuration options:
 * - You can use api.kv to store/retrieve user preferences (e.g., show/hide status)
 * - You can read config files to enable/disable this feature
 * - See commented conditional rendering example below
 */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";

export function SessionPromptAugmentedView(props: {
  api: TuiPluginApi;
  sessionID: string;
  visible?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
  ref?: (ref: any) => void;
}) {
  // Example: Read a preference from persistent key-value store
  // const showStatus = () => props.api.kv?.get("show-prompt-status", true) ?? true;

  // Example: Conditionally show/hide based on some condition
  // const shouldShowStatus = () => {
  //   // Could check config file, api.kv, session state, etc.
  //   return showStatus() && props.sessionID.length > 0;
  // };

  const compactText = () =>
    `Session: ${props.sessionID.slice(0, 8)}... | Plugin active`;

  return (
    <box gap={0}>
      {/* Render the original Prompt — REQUIRED for prompt to function */}
      <props.api.ui.Prompt
        sessionID={props.sessionID}
        visible={props.visible}
        disabled={props.disabled}
        onSubmit={props.onSubmit}
        ref={props.ref}
      />
      {/* Display session status beneath the prompt */}
      <box flexDirection="row" justifyContent="flex-end">
        <text fg={props.api.theme.current.textMuted} wrapMode="none">
          {compactText()}
        </text>
      </box>
      {/* </Show> */}
    </box>
  );
}
