import type { Logger } from "@/lib/core/logger";
import type { ProviderContext, Provider } from "@/lib/provider/types";
import { ProviderRegistry } from "@/lib/provider/registry";
import { CopilotProvider } from "@/providers/copilot/copilot";
import { OpencodeGoProvider } from "@/providers/opencode-go/go";
import { OpencodeZenProvider } from "@/providers/opencode-zen/zen";

export interface ProviderInfo {
  id: string;
  label: string;
  factory: () => Provider;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  { id: "opencode-go", label: "Opencode Go", factory: () => new OpencodeGoProvider() },
  { id: "opencode", label: "Opencode Zen", factory: () => new OpencodeZenProvider() },
  { id: "copilot", label: "GitHub Copilot", factory: () => new CopilotProvider() },
] as const;

export function getProviderIds(): string[] {
  return PROVIDERS.map(p => p.id);
}

export function getProviderLabel(id: string): string {
  return PROVIDERS.find(p => p.id === id)?.label ?? id;
}

export async function createRegistry(
  logger: Logger,
  ctx: ProviderContext,
): Promise<ProviderRegistry> {
  const registry = new ProviderRegistry(logger);

  for (const info of PROVIDERS) {
    registry.register(info.factory());
  }

  await registry.startupAll(ctx);

  return registry;
}

export function createTuiRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  for (const info of PROVIDERS) {
    registry.register(info.factory());
  }

  return registry;
}
