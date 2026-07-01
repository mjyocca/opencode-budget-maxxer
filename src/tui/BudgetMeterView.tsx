/** @jsxImportSource @opentui/solid */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { TextAttributes } from "@opentui/core";
import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { readCache } from "@/lib/budget/cache";

const BAR_WIDTH = 12;
const READ_INTERVAL_MS = 3000;

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

export function BudgetMeterView(props: { api: TuiPluginApi; sessionID?: string }) {
  const theme = () => props.api.theme.current;
  const [expanded, setExpanded] = createSignal(props.api.kv?.get("budget-expanded", false) ?? false);
  const [goEntry, setGoEntry] = createSignal<{ data: Record<string, unknown> } | null>(null);
  const [zenEntry, setZenEntry] = createSignal<{ data: Record<string, unknown> } | null>(null);
  const [activeProvider, setActiveProvider] = createSignal<string | null>(null);

  async function refresh() {
    const cache = readCache();
    if (!cache) {
      setGoEntry(null);
      setZenEntry(null);
      setActiveProvider(null);
      return;
    }
    setGoEntry(cache.entries.find((e) => e.provider === "opencode-go") ?? null);
    setZenEntry(cache.entries.find((e) => e.provider === "opencode") ?? null);

    let provider = cache.activeProvider ?? null;

    if (!provider && props.sessionID) {
      try {
        const msgs = await props.api.client?.session?.messages?.({
          sessionID: props.sessionID,
        });
        const msgList = msgs?.data ?? [];
        for (let i = msgList.length - 1; i >= 0; i--) {
          const msg = msgList[i];
          if (msg.info?.role === "assistant" && msg.info?.providerID) {
            provider = msg.info.providerID;
            break;
          }
        }
      } catch {
        // fallback failed, leave provider as-is
      }
    }

    setActiveProvider(provider);
  }

  function toggleExpand() {
    const next = !expanded();
    setExpanded(next);
    props.api.kv?.set("budget-expanded", next);
  }

  createEffect(() => {
    refresh();
  });

  const interval = setInterval(refresh, READ_INTERVAL_MS);
  onCleanup(() => clearInterval(interval));

  const goData = () => {
    const d = goEntry()?.data;
    if (!d) return null;
    return d as { rolling5h: { usagePercent: number; resetInSec: number } | null; weekly: { usagePercent: number; resetInSec: number } | null; monthly: { usagePercent: number; resetInSec: number } | null };
  };

  const zenData = () => {
    const d = zenEntry()?.data;
    if (!d) return null;
    return d as { balance: number; monthlySpending: number; monthlyLimit: number | null; autoReload: boolean };
  };

  const rolling5h = () => goData()?.rolling5h;
  const weekly = () => goData()?.weekly;
  const monthly = () => goData()?.monthly;

  const spendingPercent = () => {
    const zd = zenData();
    if (!zd || !zd.monthlyLimit || zd.monthlyLimit <= 0) return 0;
    const pct = (zd.monthlySpending / zd.monthlyLimit) * 100;
    return isNaN(pct) ? 0 : Math.round(pct);
  };

  const goBar = (v: number | null | undefined) => buildBar(safePercent(v));

  const hasData = () => goData() !== null || zenData() !== null;

  const goLabel = () => {
    const isActive = activeProvider() === "opencode-go";
    return isActive ? "Opencode Go (Active)" : "Opencode Go";
  };

  const zenLabel = () => {
    const isActive = activeProvider() === "opencode";
    return isActive ? "Opencode Zen (Active)" : "Opencode Zen";
  };

  const goLabelColor = () => {
    if (activeProvider() === "opencode-go") return theme().text;
    return theme().textMuted;
  };

  const zenLabelColor = () => {
    if (activeProvider() === "opencode") return theme().text;
    return theme().textMuted;
  };

  // Debug log
  props.api.client?.app?.log?.({
    service: "budget-maxxer-tui", level: "debug",
    message: `render: hasGo=${!!goData()}, hasZen=${!!zenData()}, active=${activeProvider() ?? "none"}`,
  });

  return (
    <box padding={1}>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        Budget Maxxer
      </text>
      <Show when={hasData()}>
        {/* Go section */}
        <Show when={goData()}>
          <text fg={goLabelColor()}>{"\n"}{goLabel()}</text>
          <Show when={rolling5h()}>
            <text fg={getBarColor(safePercent(rolling5h()?.usagePercent), theme)}>
              {" "}
              {goBar(rolling5h()?.usagePercent)}
            </text>
            <text fg={theme().text}>
              {" "}
              {safePercent(rolling5h()?.usagePercent)}%
            </text>
            <text fg={theme().textMuted}>
              {" "}
              5h:{formatDuration(rolling5h()!.resetInSec)}
            </text>
          </Show>
          <Show when={weekly()}>
            <text fg={theme().textMuted}>{"\n"}</text>
            <text fg={getBarColor(safePercent(weekly()?.usagePercent), theme)}>
              {" "}
              {goBar(weekly()?.usagePercent)}
            </text>
            <text fg={theme().text}>
              {" "}
              {safePercent(weekly()?.usagePercent)}%
            </text>
            <text fg={theme().textMuted}>
              {" "}
              wk:{formatDuration(weekly()!.resetInSec)}
            </text>
          </Show>
          <Show when={monthly()}>
            <text fg={theme().textMuted}>{"\n"}</text>
            <text fg={getBarColor(safePercent(monthly()?.usagePercent), theme)}>
              {" "}
              {goBar(monthly()?.usagePercent)}
            </text>
            <text fg={theme().text}>
              {" "}
              {safePercent(monthly()?.usagePercent)}%
            </text>
            <text fg={theme().textMuted}>
              {" "}
              mo:{formatDuration(monthly()!.resetInSec)}
            </text>
          </Show>
        </Show>

        {/* Zen section */}
        <Show when={zenData()}>
          <text fg={zenLabelColor()}>{"\n"}{zenLabel()}</text>
          <text fg={theme().text}>
            {" "}
            ${zenData()!.balance.toFixed(2)} balance
          </text>
          <Show when={zenData()!.monthlyLimit}>
            <text fg={theme().textMuted}>{"\n"}</text>
            <text fg={getBarColor(safePercent(spendingPercent()), theme)}>
              {" "}
              {buildBar(spendingPercent())}
            </text>
            <text fg={theme().text}>
              {" "}
              {spendingPercent()}%
            </text>
            <text fg={theme().textMuted}>
              {" "}
              ${zenData()!.monthlySpending.toFixed(0)}/${zenData()!.monthlyLimit!.toFixed(0)}
            </text>
          </Show>
          <Show when={zenData()!.autoReload}>
            <text fg={theme().textMuted}>{"\n"}  auto-reload</text>
          </Show>
        </Show>
      </Show>
      <Show when={!hasData()}>
        <text fg={theme().textMuted}>{"\n"}No data — run /setup_go or /setup_zen</text>
      </Show>
    </box>
  );
}
