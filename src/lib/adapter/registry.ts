import type { Logger } from "../core/logger";
import type { OpenCodeAdapter } from "./types";

/**
 * Registry for OpenCode adapters.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<string, OpenCodeAdapter>();

  constructor(private readonly logger?: Logger) { }

  /** Register one or more adapters. Fluent - returns this for chaining. */
  register(...adapters: OpenCodeAdapter[]): this {
    for (const a of adapters) {
      this.adapters.set(a.id, a);
      this.logger?.debug(`[AdapterRegistry] registered: ${a.id}`);
    }
    return this;
  }

  get(id: string): OpenCodeAdapter | null {
    return this.adapters.get(id) ?? null;
  }

  all(): OpenCodeAdapter[] {
    return [...this.adapters.values()];
  }

  ids(): string[] {
    return [...this.adapters.keys()];
  }
}
