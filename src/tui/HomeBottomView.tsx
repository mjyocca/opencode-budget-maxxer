/** @jsxImportSource @opentui/solid */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { CompactStatusLine } from "./CompactStatusLine.js";

/**
 * HomeBottomView - displays status in the bottom center of the home view
 * Used: src/tui.tsx home_bottom slot registration
 * Props: api (theme/context), compactText (signal for the status text)
 */
export function HomeBottomView(props: { api: TuiPluginApi; compactText: () => string }) {
  return (
    <box gap={0}>
      <text> </text>
      <CompactStatusLine api={props.api} text={props.compactText} justifyContent="center" />
    </box>
  );
}
