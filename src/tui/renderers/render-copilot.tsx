/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import type { CopilotUsage } from "@/providers/copilot/copilot.types";

const BAR_WIDTH = 12;

function safePercent(v: number | null | undefined): number {
  if (typeof v !== "number" || isNaN(v) || !isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function buildBar(percentUsed: number): string {
  const safe = safePercent(percentUsed);
  const filled = Math.round((safe / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

function getBarColor(percentUsed: number, theme: any): string {
  if (percentUsed < 50) return theme.success ?? theme.text;
  if (percentUsed < 80) return theme.warning ?? theme.text;
  return theme.error ?? theme.text;
}

export function renderCopilotSidebar(
  data: CopilotUsage | null,
  active: boolean,
  theme: any,
) {
  if (!data) return null;

  const labelColor = () => (active ? theme.text : theme.textMuted);
  const valueColor = () => (active ? theme.text : theme.textMuted);

  const copilotPercentUsed = () => {
    if (data.unlimited || !data.premiumInteractions) return 0;
    return 100 - safePercent(data.premiumInteractions.percent_remaining);
  };

  return (
    <Show when={data}>
      <text attributes={TextAttributes.DIM} fg={labelColor()}>
        GitHub Copilot
      </text>
      <Show when={!data.unlimited && data.premiumInteractions}>
        <text attributes={TextAttributes.BOLD} fg={valueColor()}>
          {"\n"}
          Monthly
        </text>
        <text fg={getBarColor(safePercent(copilotPercentUsed()), theme)}>
          {buildBar(copilotPercentUsed())}
        </text>
        <text fg={valueColor()}>{copilotPercentUsed()}%</text>
        <text fg={valueColor()}>
          {data.premiumInteractions!.remaining}/
          {data.premiumInteractions!.entitlement}
        </text>
      </Show>
      <Show when={data.unlimited}>
        <text fg={theme.success}>{"\n"} Unlimited</text>
      </Show>
    </Show>
  );
}
