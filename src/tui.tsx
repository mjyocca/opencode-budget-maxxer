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

  logger.info("TUI plugin initialized — slots registered");

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content: (_ctx, props) => <BudgetMeterView api={api} sessionID={props.session_id} />,
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
