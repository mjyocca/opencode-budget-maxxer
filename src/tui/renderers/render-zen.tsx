/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import type { ZenUsage } from "@/providers/opencode-zen/zen.types";

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

export function renderZenSidebar(
  data: ZenUsage | null,
  active: boolean,
  theme: any,
) {
  if (!data) return null;

  const labelColor = () => (active ? theme.text : theme.textMuted);
  const valueColor = () => (active ? theme.text : theme.textMuted);

  const spendingPercent = () => {
    if (!data.monthlyLimit || data.monthlyLimit <= 0) return 0;
    const pct = (data.monthlySpending / data.monthlyLimit) * 100;
    return isNaN(pct) ? 0 : Math.round(pct);
  };

  return (
    <Show when={data}>
      <text attributes={TextAttributes.DIM} fg={labelColor()}>
        Opencode Zen
      </text>
      <text attributes={TextAttributes.BOLD} fg={valueColor()}>
        {"\n"}
        Current Balance{" "}
      </text>
      <text fg={valueColor()}>${data.balance.toFixed(2)}</text>
      <Show when={data.monthlyLimit}>
        <text attributes={TextAttributes.BOLD} fg={valueColor()}>
          {"\n"}
          Monthly Limit{" "}
        </text>
        <text fg={valueColor()}>
          ${data.monthlySpending.toFixed(2)}/$
          {data.monthlyLimit!.toFixed(2)}
        </text>
        <text fg={theme.textMuted}>{"\n"}</text>
        <text fg={getBarColor(safePercent(spendingPercent()), theme)}>
          {buildBar(spendingPercent())}
        </text>
        <text fg={valueColor()}>{spendingPercent()}%</text>
      </Show>
      <Show when={data.autoReload}>
        <text fg={theme.textMuted}>{"\n"} auto-reload</text>
      </Show>
    </Show>
  );
}
