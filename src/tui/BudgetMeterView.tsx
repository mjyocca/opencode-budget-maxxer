/** @jsxImportSource @opentui/solid */

import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { TextAttributes } from "@opentui/core";
import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { readCache, getSessionState } from "@/cache";
import {
  renderGoSidebar,
  renderZenSidebar,
  renderCopilotSidebar,
} from "./renderers/index.js";
import type { GoRateLimit } from "@/providers/opencode-go/go.types";
import type { ZenUsage } from "@/providers/opencode-zen/zen.types";
import type { CopilotUsage } from "@/providers/copilot/copilot.types";

const READ_INTERVAL_MS = 3000;

export function BudgetMeterView(props: {
  api: TuiPluginApi;
  sessionID?: string;
}) {
  const theme = () => props.api.theme.current;
  const [goData, setGoData] = createSignal<GoRateLimit | null>(null);
  const [zenData, setZenData] = createSignal<ZenUsage | null>(null);
  const [copilotData, setCopilotData] = createSignal<CopilotUsage | null>(null);
  const [activeProvider, setActiveProvider] = createSignal<string | null>(null);

  async function refresh() {
    const cache = readCache();
    if (!cache) {
      setGoData(null);
      setZenData(null);
      setCopilotData(null);
      setActiveProvider(null);
      return;
    }

    const goEntry = cache.entries.find((e) => e.provider === "opencode-go");
    const zenEntry = cache.entries.find((e) => e.provider === "opencode");
    const copilotEntry = cache.entries.find((e) => e.provider === "copilot");

    setGoData((goEntry?.data as unknown as GoRateLimit) ?? null);
    setZenData((zenEntry?.data as unknown as ZenUsage) ?? null);
    setCopilotData((copilotEntry?.data as unknown as CopilotUsage) ?? null);

    let provider: string | null = null;

    if (props.sessionID) {
      const sessionState = await getSessionState(props.sessionID);
      provider = sessionState?.overrideProvider ?? sessionState?.activeProvider ?? null;
    }

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

  createEffect(() => {
    refresh();
  });

  const interval = setInterval(refresh, READ_INTERVAL_MS);
  onCleanup(() => clearInterval(interval));

  const hasData = () =>
    goData() !== null || zenData() !== null || copilotData() !== null;

  return (
    <box>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        Budget Maxxer
      </text>
      <Show when={hasData()}>
        <Show when={goData() && activeProvider() === "opencode-go"}>
          {renderGoSidebar(
            goData(),
            activeProvider() === "opencode-go",
            theme(),
          )}
        </Show>
        <Show when={zenData() && activeProvider() === "opencode"}>
          {renderZenSidebar(
            zenData(),
            activeProvider() === "opencode",
            theme(),
          )}
        </Show>
        <Show when={copilotData() && activeProvider() === "copilot"}>
          {renderCopilotSidebar(
            copilotData(),
            activeProvider() === "copilot",
            theme(),
          )}
        </Show>
      </Show>
      <Show when={!hasData()}>
        <text fg={theme().textMuted}>
          {"\n"}No data — run /setup_go, /setup_zen, or configure Copilot token
        </text>
      </Show>
    </box>
  );
}
