/** @jsxImportSource @opentui/solid */

import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui";
import { createSignal } from "solid-js";
import { PLUGIN_ID } from "@/lib/core/constants";
import { createTuiLogger } from "@/lib/core/logger";
import {
  HomeBottomView,
  BudgetMeterView,
  SessionPromptAugmentedView,
} from "@/tui/index.js";
import { setSessionOverrideProvider } from "@/cache";
import { PROVIDERS, createTuiRegistry } from "@/providers";

const SIDEBAR_ORDER = 300;
const COMPACT_ORDER = 90;
const REFRESH_INTERVAL_MS = 5000;

const tui: TuiPlugin = async (api: TuiPluginApi, _options) => {
  const logger = createTuiLogger(api, PLUGIN_ID);

  logger.info("TUI plugin initializing");

  const [compactText, setCompactText] = createSignal("");

  function refreshStatus() {
    setCompactText(`[${PLUGIN_ID}] active`);
  }

  refreshStatus();
  const interval = setInterval(refreshStatus, REFRESH_INTERVAL_MS);
  const unsubEvent = api.event.on("session.idle", () => {
    refreshStatus();
  });

  const [currentSessionID, setCurrentSessionID] = createSignal<string | null>(
    null,
  );

  logger.info("TUI plugin initialized — slots registered");

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content: (_ctx, props) => {
        setCurrentSessionID(props.session_id ?? null);
        return <BudgetMeterView api={api} sessionID={props.session_id} />;
      },
    },
  });

  const keymap = (api as any).keymap;
  if (keymap?.registerLayer) {
    const registry = createTuiRegistry();
    const setupCommands = registry.collectSetupCommands(api);

    const dispose = keymap.registerLayer({
      commands: [
        {
          namespace: "palette",
          name: "budget-maxxer.show",
          title: "Show Provider",
          desc: "Switch active provider",
          category: "Budget Maxxer",
          slashName: "budget:show",
          async run(input?: unknown) {
            const arg = typeof input === "string" ? input.trim() : "";
            if (!arg) {
              const DialogSelect = (api as any).ui?.DialogSelect;
              if (!DialogSelect) {
                api.ui.toast?.({
                  message: "DialogSelect not available",
                  variant: "warning",
                });
                return;
              }
              const options = [
                {
                  title: "Auto (follow model)",
                  value: "__auto__",
                  description: "Follow the active model",
                },
                ...PROVIDERS.map((p) => ({
                  title: p.label,
                  value: p.id,
                  description: `id: ${p.id}`,
                })),
              ];
              api.ui.dialog?.replace?.(() => (
                <DialogSelect
                  title="Select Provider"
                  options={options}
                  onSelect={async (option: any) => {
                    const sessionID = currentSessionID();
                    if (!sessionID) {
                      api.ui.toast?.({
                        message: "No active session",
                        variant: "warning",
                      });
                      return;
                    }
                    if (option.value === "__auto__") {
                      await setSessionOverrideProvider(sessionID, null);
                      api.ui.toast?.({
                        message: "Now following active model",
                        variant: "info",
                      });
                    } else {
                      await setSessionOverrideProvider(sessionID, option.value);
                      api.ui.toast?.({
                        message: `Now showing ${option.title}`,
                        variant: "info",
                      });
                    }
                    api.ui.dialog?.clear?.();
                  }}
                />
              ));
              api.ui.dialog?.setSize?.("medium");
              return;
            }
            if (arg === "auto" || arg === "__auto__") {
              const sessionID = currentSessionID();
              if (!sessionID) {
                api.ui.toast?.({
                  message: "No active session",
                  variant: "warning",
                });
                return;
              }
              await setSessionOverrideProvider(sessionID, null);
              api.ui.toast?.({
                message: "Now following active model",
                variant: "info",
              });
              return;
            }
            const match = PROVIDERS.find(
              (p) => p.id === arg || p.id.replace("-", "_") === arg,
            );
            if (!match) {
              api.ui.toast?.({
                message: `Unknown provider: ${arg}`,
                variant: "warning",
              });
              return;
            }
            const sessionID = currentSessionID();
            if (!sessionID) {
              api.ui.toast?.({
                message: "No active session",
                variant: "warning",
              });
              return;
            }
            await setSessionOverrideProvider(sessionID, match.id);
            api.ui.toast?.({
              message: `Now showing ${match.label}`,
              variant: "info",
            });
          },
        },
        ...setupCommands,
      ],
    });

    if (typeof dispose === "function") {
      api.lifecycle.onDispose(dispose);
    }
  }

  api.lifecycle.onDispose(() => {
    logger.info("TUI plugin disposing");
    clearInterval(interval);
    unsubEvent();
  });
};

export default {
  id: PLUGIN_ID,
  tui,
} satisfies TuiPluginModule;
