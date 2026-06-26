/** @jsxImportSource @opentui/solid */

/**
 * EXAMPLE B: Completely replace the session prompt
 *
 * This pattern demonstrates how to:
 * - Implement a completely custom prompt UI
 * - Handle custom input logic and keyboard shortcuts
 * - Take full control over the prompt experience
 *
 * Key points:
 * - Does NOT render <api.ui.Prompt> - you're replacing it entirely
 * - You must implement all input handling, submit logic, etc. yourself
 * - This is an ADVANCED pattern - most plugins should use Example A instead
 * - Use this only when you need fundamentally different prompt behavior
 *
 * WARNING:
 * - This example is intentionally minimal/non-functional
 * - A real implementation would need actual input handling
 * - You'd likely use api.ui.Input or build custom input components
 * - Consider accessibility, keyboard navigation, etc.
 *
 * To enable this example:
 * 1. Uncomment the import in src/tui.tsx
 * 2. Uncomment the session_prompt registration block for Example B
 * 3. Implement actual input handling logic (not included here)
 * 4. Rebuild and restart opencode
 *
 * Configuration options:
 * - You can use api.kv to store/retrieve custom prompt settings
 * - You can read config files to customize prompt behavior
 * - See commented conditional rendering example below
 */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { Show } from "solid-js";

export function SessionPromptCustomView(props: {
  api: TuiPluginApi;
  sessionID: string;
  visible?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  const theme = () => props.api.theme.current;

  // Example: Check if custom prompt should be enabled
  // const useCustomPrompt = () => props.api.kv?.get("use-custom-prompt", false) ?? false;

  // Example: You could fall back to the default prompt conditionally
  // if (!useCustomPrompt()) {
  //   return (
  //     <props.api.ui.Prompt
  //       sessionID={props.sessionID}
  //       visible={props.visible}
  //       disabled={props.disabled}
  //       onSubmit={props.onSubmit}
  //     />
  //   );
  // }

  return (
    <box gap={0} padding={1}>
      <Show when={props.visible}>
        <box gap={0}>
          <text fg={theme().textMuted} wrapMode="none">
            Custom Prompt for session {props.sessionID.slice(0, 8)}...
          </text>
          <text fg={theme().text}>
            [Placeholder - implement actual input handling here]
          </text>
          {/* 
            Real implementation would include:
            - An actual input component (api.ui.Input or custom)
            - Keyboard event handlers (Enter to submit, Esc to cancel, etc.)
            - Input validation and error handling
            - Integration with props.onSubmit callback
            - Proper focus management
            - Accessibility considerations
            
            Example structure:
            
            <api.ui.Input
              value={inputValue()}
              onChange={(value) => setInputValue(value)}
              onSubmit={() => {
                props.onSubmit?.();
                handleCustomSubmitLogic();
              }}
              disabled={props.disabled}
              placeholder="Type your message..."
            />
          */}
        </box>
      </Show>
    </box>
  );
}
