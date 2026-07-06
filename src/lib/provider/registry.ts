import type { Logger } from "../core/logger";
import type { Provider, ProviderContext, TuiCommand } from "./types";

export class ProviderRegistry {
  private readonly registered = new Map<string, Provider>();
  private readonly active = new Map<string, Provider>();

  constructor(private readonly logger?: Logger) { }

  register(...providers: Provider[]): this {
    for (const p of providers) {
      this.registered.set(p.id, p);
      this.logger?.debug(`[ProviderRegistry] registered: ${p.id}`);
    }
    return this;
  }

  get(id: string): Provider | null {
    return this.registered.get(id) ?? null;
  }

  all(): Provider[] {
    return [...this.active.values()];
  }

  allRegistered(): Provider[] {
    return [...this.registered.values()];
  }

  ids(): string[] {
    return [...this.active.keys()];
  }

  async startupAll(ctx: ProviderContext): Promise<void> {
    for (const provider of this.registered.values()) {
      try {
        const configured = await provider.isConfigured();
        if (!configured) {
          await this.logger?.debug(`[ProviderRegistry] ${provider.id} not configured, skipping startup`);
          continue;
        }
        this.active.set(provider.id, provider);
        await provider.startup?.(ctx);
        await this.logger?.debug(`[ProviderRegistry] ${provider.id} started`);
      } catch (err) {
        await this.logger?.warn(`[ProviderRegistry] ${provider.id} failed isConfigured check, skipping: ${err}`);
      }
    }
  }

  async cleanupAll(): Promise<void> {
    for (const provider of this.active.values()) {
      await provider.cleanup?.();
    }
  }

  collectSetupCommands(api: any): TuiCommand[] {
    const allCommands: TuiCommand[] = [];
    for (const provider of this.registered.values()) {
      const command = provider.setupCommand?.(api);
      if (command) {
        allCommands.push(command);
      }
    }
    return allCommands;
  }
}
