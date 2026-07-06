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

  let currentSessionID: string | null = null;
  const unsubSession = api.event.on("tui.session.select", (event: any) => {
    currentSessionID = event.properties.sessionID;
  });

  logger.info("TUI plugin initialized — slots registered");

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content: (_ctx, props) => (
        <BudgetMeterView api={api} sessionID={props.session_id} />
      ),
    },
  });

  api.slots.register({
    order: COMPACT_ORDER,
    slots: {
      home_bottom: () => <HomeBottomView api={api} compactText={compactText} />,
    },
  });

  api.slots.register({
    order: COMPACT_ORDER,
    slots: {
      session_prompt: (_ctx, props) => (
        <SessionPromptAugmentedView
          api={api}
          sessionID={props.session_id}
          visible={props.visible}
          disabled={props.disabled}
          onSubmit={props.on_submit}
          ref={props.ref}
        />
      ),
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
                    if (!currentSessionID) {
                      api.ui.toast?.({
                        message: "No active session",
                        variant: "warning",
                      });
                      return;
                    }
                    if (option.value === "__auto__") {
                      await setSessionOverrideProvider(currentSessionID, null);
                      api.ui.toast?.({
                        message: "Now following active model",
                        variant: "info",
                      });
                    } else {
                      await setSessionOverrideProvider(
                        currentSessionID,
                        option.value,
                      );
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
              if (!currentSessionID) {
                api.ui.toast?.({
                  message: "No active session",
                  variant: "warning",
                });
                return;
              }
              await setSessionOverrideProvider(currentSessionID, null);
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
            if (!currentSessionID) {
              api.ui.toast?.({
                message: "No active session",
                variant: "warning",
              });
              return;
            }
            await setSessionOverrideProvider(currentSessionID, match.id);
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
    unsubSession();
  });
};

export default {
  id: PLUGIN_ID,
  tui,
} satisfies TuiPluginModule;
