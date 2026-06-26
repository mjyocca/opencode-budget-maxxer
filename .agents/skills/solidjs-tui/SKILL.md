---
name: solidjs-tui
description: SolidJS primitives and patterns tailored for terminal UI development in opencode plugins. Covers createSignal, createEffect, createMemo, createResource, control flows, lifecycle, reactive chains, and @opentui/solid hooks. Use when building TUI components, managing reactive state, or handling reactivity patterns.
---

# SolidJS for Opencode TUI Plugins

This skill maps **SolidJS primitives, control flows, and patterns** specifically to terminal UI development in opencode plugins. It does not cover general SolidJS theory or SSR — only what you need for `tui.tsx` plugin development.

## Core SolidJS Primitives

### `createSignal` — Reactive State

The most commonly used primitive. Returns a getter (accessor) and setter.

```ts
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(0);
const n = count();      // read — registers dependency
setCount(10);           // write — triggers re-renders
setCount(c => c + 1);  // write — updater function

// With custom equality (batches updates when prev === next)
const [state, setState] = createSignal({ x: 0, y: 0 }, {
  equals: (a, b) => a.x === b.x && a.y === b.y,
});
```

**TUI pattern — status display:**

```ts
// Current codebase usage (src/tui.tsx):
const [statusText, setStatusText] = createSignal("Initializing...");
const [compactText, setCompactText] = createSignal("");

function refreshStatus() {
  setStatusText(`Plugin TUI Loaded — ${Date.now()}`);
  setCompactText(`[${PLUGIN_ID}] active`);
}
```

**Props as signals:** When a prop is a signal, pass it as-is and call it in the component:

```tsx
// Parent component passes signal
<CompactStatusLine api={api} text={statusText} />

// Child component receives signal and reads it
export function CompactStatusLine(props: { text: () => string }) {
  return <text>{props.text()}</text>;  // called, not passed as .()
}
```

### `createMemo` — Derived State

Memoizes a computed value. Only re-evaluates when its signal dependencies change. Returns an accessor.

```ts
import { createMemo } from "solid-js";

const [items] = createSignal([1, 2, 3]);
const [filter, setFilter] = createSignal("");

// Only re-computes when items() or filter() changes
const filtered = createMemo(() => 
  items().filter(i => i > filter())
);

<For each={filtered()}>{n => <text>{n}</text>}</For>
```

**TUI pattern — formatted display from session state:**

```ts
// Instead of inline arrow functions in templates (recreates function each render),
// use createMemo for derived display strings:
const [sessionID] = createSignal("abc123");
const [isConnected] = createSignal(true);

const statusLine = createMemo(() => {
  if (!isConnected()) return "Disconnected";
  return `Session: ${sessionID().slice(0, 8)}... | Plugin active`;
});

// Then in template:
text() => <text fg={api.theme.current.textMuted}>{statusLine()}</text>
```

### `createResource` — Async Data with Reactive States

Returns a resource with states: `unresolved` → `pending` → `ready` / `errored`. Supports source-driven auto-fetching.

```ts
import { createResource } from "solid-js";

// Without source — manual control
const [data, { loading, error, refetch }] = createResource(
  () => fetch("/api/data").then(r => r.json())
);

// With reactive source — auto-fetches whenever sessionID changes
const [sessionID] = createSignal("abc123");
const [sessionData] = createResource(
  sessionID,  // source — re-fetches when source changes
  async (id) => {
    const res = await api.client?.session?.get?.({ id });
    return res?.body;
  }
);
```

**Resource state shapes:**

```ts
// sessionData returns one of these:
interface Unresolved { state: "unresolved"; loading: false; (): undefined; }
interface Pending    { state: "pending";    loading: true;  (): undefined; }
interface Ready      { state: "ready";      loading: false; (): T; }
interface Errored    { state: "errored";    loading: false; error: any; () : never; }
```

**TUI pattern — loading-aware UI:**

```tsx
{showErrorBoundary ? (
  <ErrorBoundary fallback={err => <text fg={api.theme.current.error}>{err.message}</text>}>
    {() => (
      <>
        {sessionData.state === "pending" && <text fg={api.theme.current.textMuted}>Loading...</text>}
        {sessionData.state === "ready" && <text>{sessionData()?.name}</text>}
        {sessionData.state === "errored" && <text fg={api.theme.current.error}>Failed: {sessionData.error}</text>}
      </>
    )}
  </ErrorBoundary>
) : <text fg={api.theme.current.warning}>Error boundary unavailable</text>}
```

### `createEffect` — Side Effects

Runs after render, tracks signal dependencies automatically. For DOM/terminal side effects.

```ts
import { createEffect } from "solid-js";

// Logs whenever statusText changes
createEffect(() => {
  api.client?.app?.log?.({
    body: {
      service: "my-plugin-tui",
      level: "debug",
      message: "Status changed",
      extra: { status: statusText() },
    },
  });
});
```

**TUI pattern — toast on state change:**

```ts
createEffect(() => {
  const count = sessionCount(); // tracked dependency
  if (count > maxCount()) {
    api.ui.toast?.({
      message: `Session count (${count}) exceeded threshold (${maxCount()})`,
      variant: "warning",
    });
  }
});
```

### `createRenderEffect` — Layout-Phase Side Effects

Runs **during** the render phase, before nodes are connected. Use for layout calculations, dimension computations.

```ts
import { createRenderEffect } from "solid-js";

// Calculate layout dimensions before the node is connected to the terminal
createRenderEffect(() => {
  const dims = api.ui.terminal?.dimensions(); // or useTerminalDimensions()
  const availableWidth = dims?.width ?? 80;
  setLayoutWidth(Math.min(availableWidth - 4, 60));
});
```

**Performance note:** `createRenderEffect` is preferred over `createEffect` when the side effect influences what gets rendered (layout, dimensions, sizing) because it runs before child nodes are created.

### `createComputed` — One-Time Derived Values

Runs **before** render. Like `createMemo` but doesn't return a value — use when you need a side effect that runs before DOM/terminal nodes are created.

```ts
import { createComputed } from "solid-js";

// Validate config before rendering
createComputed(() => {
  const config = loadPluginConfig();
  if (!config?.apiKey) {
    console.warn("[my-plugin] Missing API key — some features disabled");
  }
});
```

### `batch` — Batch Multiple Signal Updates

Batches multiple signal updates into a single render notification. Important for performance.

```ts
import { batch } from "solid-js";

// Without batch — triggers 3 re-renders
setStatus("active");
setError(null);
setItems([]);

// With batch — triggers 1 re-render
batch(() => {
  setStatus("active");
  setError(null);
  setItems([]);
});
```

**TUI pattern — bulk UI state reset:**

```ts
function resetState() {
  batch(() => {
    setStatusText("Reset");
    setCompactText("");
    setSelectedSession(null);
    setFilter("");
    setLayoutWidth(0);
  });
}
```

### `untrack` — Opt-Out of Tracking

Reads a signal without registering it as a dependency. Useful in event handlers where you want the latest value but don't want to cause re-renders.

```ts
import { untrack } from "solid-js";

const [count, setCount] = createSignal(0);

const handleClick = () => {
  // Reading count() here would add createEffect as a dependency
  // untrack prevents that
  const snapshot = untrack(count);
  console.log(`Count was ${snapshot}`);
  setCount(c => c + 1);
};
```

### `on` — Explicit Dependency Tracking

Makes effect dependencies explicit. Useful for performance optimization or when you only want certain signals to trigger the effect.

```ts
import { createEffect, on } from "solid-js";

// Only triggers when sessionID changes, not when filter changes
createEffect(
  on(sessionID, (id) => {
    // sessionID is captured explicitly, filter() can be read freely here
    // without triggering the effect
    fetchSession(id);
  })
);
```

### `createSelector` — O(1) Active State

Creates a fast selector function for tracking active items in a list.

```ts
import { createSelector } from "solid-js";

const [selectedId] = createSignal<string | null>(null);
const isSelected = createSelector(selectedId);

// In a list — only updates when the selected id matches/doesn't match
<For each={sessionList()}>
  {s => (
    <box classList={{ active: isSelected(s.id) }}>
      <text>{s.name}</text>
    </box>
  )}
</For>
```

### `createDeferred` — Debounced State

The computed value only updates when there are no more signal changes within the timeout window.

```ts
import { createDeferred } from "solid-js";

const [searchInput] = createSignal("");
const deferredSearch = createDeferred(searchInput, { timeoutMs: 300 });

// Triggers API call only after user stops typing for 300ms
createEffect(() => {
  const q = deferredSearch();
  if (q) searchAPI(q);
});
```

### `startTransition` / `useTransition` — Non-Blocking Updates

Marks state updates as non-blocking. Useful for expensive terminal UI updates that shouldn't block input responsiveness.

```ts
import { startTransition, useTransition } from "solid-js";

const [isTransitioning, startTransition] = useTransition();

const handleInput = (value: string) => {
  startTransition(() => {
    // These updates are deferred — UI stays responsive
    setInput(value);
    setFiltered(computeFiltered(value)); // expensive computation
  });
};
```

### `observable` / `from` — Interop with Observable Libraries

Converts signals to Observables for use with libraries like RxJS.

```ts
import { observable } from "solid-js";
import { from } from "rxjs";

const [input] = createSignal("");
const input$ = from(observable(input));
// input$.subscribe(v => handleInput(v));
```

### `createStore` — Nested Reactive State

For complex nested objects or arrays where you need fine-grained reactivity. Unlike signals, stores provide:
- Nested property tracking (only changed properties trigger re-renders)
- Mutable-style API for deep updates
- Array mutation methods (push, pop, splice)

```ts
import { createStore } from "solid-js/store";

// Session list state
const [sessions, setSessions] = createStore<{ id: string; name: string; status: string }[]>([]);

// Deep updates only trigger re-renders for affected components
setSessions(0, "status", "active");  // only components reading sessions[0].status re-render

// Array mutations
setSessions(sessions.length, { id: "new", name: "Session", status: "idle" });

// Batch updates with produce helper
import { produce } from "solid-js/store";
setSessions(produce(draft => {
  draft[0].status = "active";
  draft.push({ id: "x", name: "Y", status: "idle" });
}));
```

**TUI pattern — session list management:**

```ts
import { createStore } from "solid-js/store";

const [state, setState] = createStore({
  sessions: [] as Session[],
  selectedId: null as string | null,
  filter: "",
});

// Only components reading `filter` re-render
setState("filter", input);

// Only components reading the specific session re-render
setState("sessions", (s) => s.id === id, "status", "active");

<For each={state.sessions}>
  {(session) => (
    <box classList={{ active: state.selectedId === session.id }}>
      <text>{session.name} - {session.status}</text>
    </box>
  )}
</For>
```

**When to use stores vs signals:**
- **Signals** → scalar values, simple objects, independent state pieces
- **Stores** → nested objects, arrays with many items, complex relational state

### `createContext` / `useContext` — Scoped State Sharing (Rarely Needed)

SolidJS context allows sharing state across a component tree without prop drilling. **However**, in OpenCode TUI plugins, the `api` object is already globally accessible, which handles most context needs (theme, client, events, lifecycle).

**Use context only if:**
- You need plugin-specific state scoped to a subtree
- You're building a reusable component library
- You need to override behavior in nested components

```ts
import { createContext, useContext } from "solid-js";

// Create context
const PluginContext = createContext<{ logger: Logger }>();

// Provide at root
function RootComponent(props: { api: any }) {
  const logger = createTuiLogger(api, "my-plugin");
  
  return (
    <PluginContext.Provider value={{ logger }}>
      <ChildComponent />
    </PluginContext.Provider>
  );
}

// Consume in children
function ChildComponent() {
  const ctx = useContext(PluginContext);
  ctx?.logger.info("Child rendered");
  return <text>Child</text>;
}
```

**Note:** Most TUI plugins don't need custom contexts since `api.theme`, `api.client`, `api.event`, etc. are globally accessible. Consider using signals or stores first.

---

## Control Flow Components

### `<Show>` — Conditional Rendering

```tsx
import { Show } from "solid-js";

// Basic — renders children when condition is truthy
<Show when={isConnected()}>
  <text fg={theme().text}>Connected</text>
</Show>

// With fallback
<Show when={isConnected()} fallback={<text fg={theme().error}>Disconnected</text>}>
  <text fg={theme().text}>Connected</text>
</Show>

// Keyed — passes the unwrapped value to children
<Show when={activeSession} keyed>
  {(session) => <text>{session().name}</text>}
</Show>
```

### `<For>` — Non-Keyed List Rendering

For lists where items stay in place but values change.

```tsx
import { For } from "solid-js";

<For each={items()} fallback={<text>No items</text>}>
  {(item, index) => (
    <text>{`${index()}: ${item.name}`}</text>
  )}
</For>
```

### `<Index>` — Keyed List Rendering

For lists where items may be inserted, removed, or reordered (uses fixed indices with changing items).

```tsx
import { Index } from "solid-js";

<Index each={items()} fallback={<text>No items</text>}>
  {(item, index) => (
    <text>{`${index}: ${item()!.name}`}</text>
  )}
</Index>
```

**When to use `<For>` vs `<Index>`:**
- `<For>` — items stay in fixed positions, values change (status columns, fixed table)
- `<Index>` — items get added/removed/reordered (session list with scroll)

### `<Switch>` / `<Match>` — Multi-Way Conditionals

```tsx
import { Switch, Match } from "solid-js";

<Switch>
  <Match when={status() === "loading"}>
    <text fg={theme().textMuted}>Loading...</text>
  </Match>
  <Match when={status() === "error"}>
    <text fg={theme().error}>Error</text>
  </Match>
  <Match when={status() === "ready"}>
    <text fg={theme().text}>Ready</text>
  </Match>
  <Match when={status() === "idle"}>
    <text fg={theme().warning}>Idle</text>
  </Match>
</Switch>
```

### `<ErrorBoundary>` — Error Recovery

Catches errors in child components and renders a fallback.

```tsx
import { ErrorBoundary } from "solid-js";

<ErrorBoundary
  fallback={(err, reset) => (
    <box flexDirection="column">
      <text fg={api.theme.current.error}>Plugin Error</text>
      <text fg={api.theme.current.textMuted}>{err.message}</text>
      <text fg={api.theme.current.textMuted} onClick={reset}>Click to retry</text>
    </box>
  )}
>
  <SidebarPanel api={api} statusText={statusText} />
</ErrorBoundary>
```

---

## JSX Patterns for TUI

### Component Composition

The existing codebase demonstrates a consistent pattern: each slot component is a separate exported function.

```ts
// src/tui/SidebarPanelView.tsx
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
```

### Slot Component Signature

Slot components receive `(ctx, props)` where `ctx.theme.current` is the theme accessor and `props` contains slot-specific data.

```tsx
function MySlotComponent(ctx: any, props: { session_id?: string }) {
  const theme = () => ctx.theme.current;  // or props.api.theme.current
  
  return (
    <box padding={1}>
      <text fg={theme().text}>Content</text>
    </box>
  );
}
```

**Important:** `session_id` in props is **optional** — non-session slots don't provide it.

### Props Forwarding to Built-In Components

When using built-in components like `api.ui.Prompt`, all props must be forwarded including `ref`:

```tsx
<props.api.ui.Prompt
  sessionID={props.sessionID}
  visible={props.visible}
  disabled={props.disabled}
  onSubmit={props.onSubmit}
  ref={props.ref}  // REQUIRED for proper prompt functionality
/>
```

### Dynamic Components

Use `<Dynamic>` to render different components based on state:

```tsx
import { Dynamic } from "@opentui/solid";

const [viewType] = createSignal<"panel" | "list" | "detail">("panel");

const views = {
  panel: SidebarPanelView,
  list: SessionListView,
  detail: SessionDetailPanel,
};

<Dynamic component={views[viewType()]} api={api} />
```

### Portals

Use `<Portal>` to render content at a different location in the terminal hierarchy (overlays, tooltips, modals):

```ts
import { Portal } from "@opentui/solid";

function Tooltip(props: { x: number; y: number; content: () => string }) {
  return (
    <Portal>
      <box position="fixed" left={props.x} top={props.y}>
        <text fg={props.api.theme.current.warning}>{props.content()}</text>
      </box>
    </Portal>
  );
}
```

### Children Pattern

Use `children()` to receive and manipulate child content:

```tsx
import { children } from "solid-js";

function CollapsiblePanel(props: { title: string }) {
  const resolved = () => children(() => props.children);
  const items = () => resolved()?.filter(e => (e as any).type === "box");
  
  return (
    <box>
      <text fg={theme().text}>{props.title}</text>
      {items()}
    </box>
  );
}
```

---

## Lifecycle & Reactivity

### Mount, Cleanup, and Dispose

```ts
import { onMount, onCleanup } from "solid-js";

export function MyPlugin(api: any) {
  // onMount — runs once after the plugin component is mounted
  onMount(() => {
    console.log("[my-plugin] TUI component mounted");
    fetchData();
  });
  
  // onCleanup — registered within onMount scope
  const unsub = api.event.on("session.updated", handler);
  onCleanup(() => unsub());
  
  // api.lifecycle.onDispose for plugin-level disposal
  api.lifecycle?.onDispose?.(() => {
    // Plugin-level cleanup runs when the TUI plugin is unloaded
  });
}
```

### Reactive Chain Order in TUI

Signals → memos → effects → slot re-renders flow like this:

```
Signal set → scheduler queue → render phase (createRenderEffect) → DOM/terminal nodes → commit phase → createEffect (side effects)
```

Key implications:
1. `createRenderEffect` runs before slot re-render — use for layout/dimension calculations
2. `createEffect` runs after — use for logging, toast, network calls
3. `createComputed` runs before render — use for validation, config checks
4. `createMemo` is the only one that caches and returns an accessor — use for derived display data

### Disposal Caveats

| Context | Auto-disposes? | Cleanup needed |
|---------|---------------|----------------|
| `createSignal` in TUI plugin scope | No | Manual via `clearInterval`, `unsubEvent()` in `onDispose` |
| `createSignal` in slot component | No | Slot re-registration may leak old signals — use `onCleanup` |
| `createEffect` in TUI plugin | No | Unsub from events manually in `onDispose` |
| `createRoot` (detached) | No | Must call returned `dispose` function |
| `api.lifecycle.onDispose` callback | N/A | Automatic cleanup |

### `createRoot` — Detached Reactive Roots

Creates a reactive context that does not auto-dispose. Useful for timers, external event listeners, or long-lived subscriptions.

```ts
import { createRoot, createSignal } from "solid-js";

// Detached root — survives slot re-registration
createRoot((dispose) => {
  const [timer, setTimer] = createSignal(0);
  
  const interval = setInterval(() => setTimer(n => n + 1), 1000);
  
  // Pass dispose to be called in onDispose
  api.lifecycle?.onDispose?.(dispose);
  
  // Slot component reads the signal
  return <text>{timer()}s elapsed</text>;
});
```

### `getOwner` / `runWithOwner` — Manual Ownership

For advanced use cases where you need to programmatically control the reactive owner:

```ts
import { getOwner, runWithOwner } from "solid-js";

// Get the current reactive owner (the slot component's owner)
const owner = getOwner();

// Execute a function under a specific owner context
runWithOwner(someOwner, () => {
  createEffect(() => {
    // This effect is owned by `someOwner`, not the current slot
    console.log(owner?.name);
  });
});
```

---

## @opentui/solid Hooks

### `useTimeline` — Message Timeline Access

```ts
import { useTimeline } from "@opentui/solid";

const timeline = useTimeline();
// Access messages, their order, timeline position
```

### `onResize` / `useTerminalDimensions` — Terminal Sizing

```ts
import { onResize, useTerminalDimensions } from "@opentui/solid";

// Callback fires when terminal resizes
onResize((dimension) => {
  setLayoutWidth(dimension.width - 4);
});

// Or get current dimensions as an accessor
const dimensions = useTerminalDimensions();
<box width={(dimensions()?.width ?? 80) - 4}>...</box>
```

### `onFocus` / `onBlur` — Focus Events

```ts
import { onFocus, onBlur } from "@opentui/solid";

onFocus(() => {
  setFocused(true);
});

onBlur(() => {
  setFocused(false);
});
```

### `useKeyboard` / `useKeyHandler` — Keyboard Events

```ts
import { useKeyHandler } from "@opentui/solid";

const dispose = useKeyHandler((key, modifiers) => {
  if (key === "Escape") handleClose();
  if (key === "Enter" && modifiers.meta) handleSubmit();
}, { namespace: "my-plugin-dialog" });

api.lifecycle?.onDispose?.(dispose);
```

### `useSelectionHandler` — Selection Events

```ts
import { useSelectionHandler } from "@opentui/solid";

useSelectionHandler((selection) => {
  const text = selection.text;
  // Handle text selection in the terminal
});
```

### `usePaste` — Paste Events

```ts
import { usePaste } from "@opentui/solid";

usePaste((text) => {
  setInputValue(prev => prev + text);
});
```

### `useRenderer` — Direct Renderer Access

```ts
import { useRenderer } from "@opentui/solid";

const renderer = useRenderer();
// Direct access to the underlying @opentui renderer for advanced custom rendering
```

---

## Complete Patterns from the Codebase

### Pattern 1: Status Display with Signal + createMemo

**Current:** Inline arrow function in template (creates new function each render):

```ts
const [statusText, setStatusText] = createSignal("...");

<text>{() => statusText()}</text>  // new function every render
```

**Optimized:** Use `createMemo` for derived strings:

```ts
const statusText = createSignal("...")[0];
const compactLine = createMemo(() => {
  return `${statusText()} | ${new Date().toLocaleTimeString()}`;
});

<text>{compactLine()}</text>  // no wrapper function needed
```

### Pattern 2: Event-Driven Refresh with Proper Cleanup

```ts
const unsub = api.event.on("session.idle", refresh);
api.lifecycle?.onDispose?.(() => {
  unsub();  // unsub is a function returned by event.on
});
```

### Pattern 3: Timer with dispose

```ts
let disposeTimer: (() => void) | null = null;

createRoot(dispose => {
  const [tick, setTick] = createSignal(0);
  const interval = setInterval(() => setTick(n => n + 1), 1000);
  disposeTimer = () => { clearInterval(interval); dispose(); };
});

api.lifecycle?.onDispose?.(() => disposeTimer?.());
```

### Pattern 4: Resource-Loaded Session Data

```ts
const [sessionId] = createSignal("");
const [session, { state, error }] = createResource(
  sessionId,
  async (id) => {
    const res = await api.client?.session?.get?.({ id });
    return res?.body;
  }
);

<Switch>
  <Match when={state === "pending"}>
    <text fg={api.theme.current.textMuted}>Loading session...</text>
  </Match>
  <Match when={state === "errored"}>
    <text fg={api.theme.current.error}>Failed: {error.message}</text>
  </Match>
  <Match when={state === "ready"}>
    <text>{session()?.title}</text>
  </Match>
</Switch>
```

---

## When to Reference Other Skills

This skill covers SolidJS primitives and reactivity specifically for TUI plugins. For adjacent concerns, reference the appropriate skill below.

### For Slot Registration, JSX Components, Themes, and TUI Troubleshooting
→ **`plugin-tui`** — The primary skill for opencode TUI plugin development. Covers all slot types (`sidebar_content`, `home_bottom`, `session_prompt`, etc.), JSX layout components (`<box>`, `<text>`, `<scrollbox>`), built-in components (`<Markdown>`, `<Slider>`, `api.ui.Prompt`), theme colors, keymap/slash commands, toast notifications, dialog patterns, and TUI loading troubleshooting.

This skill covers the **primitives** (signals, effects, resources, control flows). `plugin-tui` covers the **slots and components** you render them with. Use both together when building any TUI plugin.

### For Server Plugin Development (Hooks, Tools, SDK Patterns)
→ **`plugin-server`** — Hook registration, tool definitions, event handling on the server side, plugin lifecycle, and SDK patterns for `src/index.ts`. When the TUI plugin needs to communicate with the server plugin (shared state, shared config, shared events), cross-reference this skill for the server-side API.

### For Plugin Lifecycle, Events, and SDK Configuration
→ **`plugin-quick-start`** — Common first tasks: add a tool, handle an event, add a TUI slot. The canonical starting point when the user is new to plugin development.

→ **`opencode-plugin-architecture`** (`../opencode-plugin-architecture.md`) — Comprehensive reference for all opencode plugin architecture: the complete list of 34+ event types with parameters, all hooks and their signatures, config resolution, and the full plugin interface. Reference this when you need the complete event parameter schema or hook signature.

### For Reading Config, API Keys, and Runtime Paths
→ **`plugin-config-patterns`** — Config resolution, JSONC parsing, resolving API keys from config files, runtime paths, and env templates. When the TUI plugin needs to read user config or resolve secrets, reference this skill.

### For Logging Patterns
→ **`plugin-logging`** — SDK structured logging for server plugins, TUI logging with SDK only (no stderr), debug modes, and log filter commands. When implementing debug output from the TUI or diagnosing state issues, reference this skill.

### For Agent Configuration
→ **`opencode-agents`** — Built-in agents, custom agent config, permissions, subagents, and agent creation. When the TUI plugin interacts with agents (agent selection, agent config panels, agent state display), reference this skill.

### For Plugin Specification and Design
→ **`plugin-spec`** — Writing a spec for a plugin feature: defining the problem, use cases, design, and implementation plan. Use before building any significant TUI feature that needs architectural decisions.

### For Troubleshooting
→ **`opencode-troubleshooting`** — Plugin loading issues, TUI problems, skill discovery, config resolution, and common error patterns. Reference when the plugin fails to load, slots don't render, or errors occur at runtime.

### For OpenCode SDK Source
→ **[OpenCode SDK Types](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)** — All 34+ TUI event types with full parameter schemas. Reference when you need the exact shape of an event payload (e.g., `session.updated` params, `tui.session.select` params).

→ **[OpenCode Source Code](https://github.com/anomalyco/opencode)** — The full opencode codebase. Reference the TUI runtime code for understanding how opencode integrates with and manages SolidJS underneath.

### For SolidJS Core
→ **[SolidJS Documentation](https://docs.solidjs.com/)** — Comprehensive reference for all SolidJS primitives and concepts not specific to TUI.

→ **[solid-js Source Code](https://github.com/solidjs/solid/tree/main/packages/solid)** — Type definitions at `packages/solid/types/reactive/signal.d.ts` (signals, effects, resources) and `packages/solid/types/render/flow.d.ts` (Show, For, Index, Switch/Match, ErrorBoundary). Reference when you need the exact primitive signatures or edge case behavior.

→ **[solid-js Store](https://github.com/solidjs/solid/tree/main/packages/solid/store)** — Store type definitions at `packages/solid/store/types/store.d.ts`. Reference for nested reactivity patterns and fine-grained updates.

→ **[SolidJS API Reference](https://docs.solidjs.com/reference/)** — Online API docs organized by primitive, component, and concept.

→ **[SolidJS Store Docs](https://docs.solidjs.com/reference/store-utilities/create-store)** — Complete store API documentation including `createStore`, `produce`, `reconcile`, and modifiers.

### For @opentui Components
→ **[@opentui/solid Source](https://github.com/opentui/opentui/tree/main/packages/solid)** — Slot registry, renderers, JSX bindings, and the `@opentui/solid` integration code. Reference when you need to understand how slots are registered or how components are rendered.

→ **[@opentui/core Components](https://github.com/opentui/opentui/tree/main/packages/core)** — The terminal renderable components (`box`, `text`, `input`, `scrollbox`, `code`, `diff`, `line_number`, `markdown`, `span`, etc.) and their props. Reference for the full prop API of any terminal component.
