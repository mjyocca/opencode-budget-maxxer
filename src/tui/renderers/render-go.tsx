/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import type { GoRateLimit, GoWindow } from "@/providers/opencode-go/go.types";

const BAR_WIDTH = 12;

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "now";
  const hours = Math.floor(seconds / 3_600);
  const mins = Math.floor((seconds % 3_600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

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

export function renderGoSidebar(
  data: GoRateLimit | null,
  active: boolean,
  theme: any,
) {
  if (!data) return null;

  const labelColor = () => (active ? theme.text : theme.textMuted);
  const valueColor = () => (active ? theme.text : theme.textMuted);

  const goBar = (v: number | null | undefined) => buildBar(safePercent(v));

  return (
    <Show when={data}>
      <text attributes={TextAttributes.DIM} fg={labelColor()}>
        Opencode Go
      </text>
      <Show when={data?.rolling5h}>
        <text attributes={TextAttributes.BOLD} fg={valueColor()}>
          {"\n"}
          Daily
        </text>
        <text fg={getBarColor(safePercent(data?.rolling5h?.usagePercent), theme)}>
          {goBar(data?.rolling5h?.usagePercent)}
        </text>
        <text fg={valueColor()}>
          {safePercent(data?.rolling5h?.usagePercent)}%
        </text>
        <text fg={valueColor()}>
          {formatDuration(data?.rolling5h?.resetInSec ?? 0)}
        </text>
      </Show>
      <Show when={data?.weekly}>
        <text attributes={TextAttributes.BOLD} fg={valueColor()}>
          {"\n"}
          Weekly
        </text>
        <text fg={getBarColor(safePercent(data?.weekly?.usagePercent), theme)}>
          {goBar(data?.weekly?.usagePercent)}
        </text>
        <text fg={valueColor()}>
          {safePercent(data?.weekly?.usagePercent)}%
        </text>
        <text fg={valueColor()}>
          {formatDuration(data?.weekly?.resetInSec ?? 0)}
        </text>
      </Show>
      <Show when={data?.monthly}>
        <text attributes={TextAttributes.BOLD} fg={valueColor()}>
          {"\n"}
          Monthly
        </text>
        <text fg={getBarColor(safePercent(data?.monthly?.usagePercent), theme)}>
          {goBar(data?.monthly?.usagePercent)}
        </text>
        <text fg={valueColor()}>
          {safePercent(data?.monthly?.usagePercent)}%
        </text>
        <text fg={valueColor()}>
          {formatDuration(data?.monthly?.resetInSec ?? 0)}
        </text>
      </Show>
    </Show>
  );
}
