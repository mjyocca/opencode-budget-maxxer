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
  SidebarPanelView,
  SessionPromptAugmentedView,
} from "@/tui/index.js";

const SIDEBAR_ORDER = 300;
const COMPACT_ORDER = 90;
const REFRESH_INTERVAL_MS = 5000;

function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const tui: TuiPlugin = async (api: TuiPluginApi, _options) => {
  const logger = createTuiLogger(api, PLUGIN_ID);

  logger.info("TUI plugin initializing");

  const [statusText, setStatusText] = createSignal("Initializing...");
  const [compactText, setCompactText] = createSignal("");

  function refreshStatus() {
    const now = new Date().toLocaleTimeString();
    setStatusText(`Plugin TUI Loaded — ${todayMonth()} — ${now}`);
    setCompactText(`[${PLUGIN_ID}] active`);
  }

  refreshStatus();
  const interval = setInterval(refreshStatus, REFRESH_INTERVAL_MS);
  const unsubEvent = api.event.on("session.idle", () => {
    refreshStatus();
  });

  logger.info("TUI plugin initialized — slots registered");

  // Sidebar panel in the left sidebar
  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content: (_ctx, _props) => (
        <SidebarPanelView api={api} statusText={statusText} />
      ),
    },
  });

  // Compact status line at the bottom of the home view
  api.slots.register({
    order: COMPACT_ORDER,
    slots: {
      home_bottom: () => <HomeBottomView api={api} compactText={compactText} />,
    },
  });

  // Session prompt with extended context below it
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
