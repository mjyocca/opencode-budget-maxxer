import type { PluginInput } from "@opencode-ai/plugin";

export type { PluginInput };

export interface ProviderResult<T = unknown> {
  attempted: boolean;
  data: T | null;
  error: string | null;
}

export interface ProviderRequestOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface ProviderContext {
  plugin: PluginInput;
}

export interface ProviderAuth {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

export interface TuiCommand {
  namespace: string;
  name: string;
  title: string;
  desc: string;
  category: string;
  slashName: string;
  run: (input?: unknown) => Promise<void> | void;
}

export interface Provider {
  readonly id: string;
  readonly displayName: string;

  loadAuth(ctx: ProviderContext): Promise<ProviderAuth>;

  fetchProviderApi<T>(
    path: string,
    options?: ProviderRequestOptions,
  ): Promise<ProviderResult<T>>;

  isConfigured(): Promise<boolean>;

  startup?(ctx: ProviderContext): Promise<void>;

  cleanup?(): Promise<void>;

  inspect(ctx: ProviderContext): Promise<Record<string, unknown>>;

  /**
   * Returns a TUI command for provider setup.
   * Called for all registered providers regardless of configuration state.
   */
  setupCommand?(api: any): TuiCommand | null;
}
