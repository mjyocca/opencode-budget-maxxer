/** @jsxImportSource @opentui/solid */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { TextAttributes } from "@opentui/core";

/**
 * SidebarPanel - displays plugin title and status in the left sidebar
 * Used: src/tui.tsx sidebar_content slot registration
 * Props: api (theme/context), statusText (signal for dynamic content)
 */
export function SidebarPanelView(props: { api: TuiPluginApi; statusText: () => string }) {
  const theme = () => props.api.theme.current;

  return (
    <box padding={1}>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        Plugin Kit
      </text>
      <text fg={theme().textMuted}>
        {"\n"}
        {props.statusText()}
      </text>
    </box>
  );
}
