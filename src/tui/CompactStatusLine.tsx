/** @jsxImportSource @opentui/solid */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { Show } from "solid-js";

/**
 * CompactStatusLine - a single-line status display for compact views
 * Used: HomeBottomView (home bottom), SessionPromptAugmented (session prompt)
 * Props: api (theme/context), text (signal for the line text), justifyContent
 */
export function CompactStatusLine(props: {
  api: TuiPluginApi;
  text: () => string;
  justifyContent: "flex-start" | "center" | "flex-end";
}) {
  return (
    // Show conditionally renders children only when text() is truthy
    <Show when={props.text()}>
      <box flexDirection="row" justifyContent={props.justifyContent}>
        <text fg={props.api.theme.current.textMuted} wrapMode="none">
          {props.text()}
        </text>
      </box>
    </Show>
  );
}
