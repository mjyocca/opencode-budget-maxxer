import type { Hooks } from "@opencode-ai/plugin";

/**
 * Generic factory that wraps any handler in a
 * correctly-typed Partial<Hooks & Omit<Hooks, 'auth' | 'provider'>>, the
 * shape composeHooks() expects.
 *
 * @example
 * export function buildChatHeadersHook(...) {
 *   return defineHook("chat.headers", async (input, output) => { ... })
 * }
 */
export function defineHook<K extends keyof Hooks>(
  key: K,
  handler: NonNullable<Hooks[K]>,
): Partial<Hooks> {
  return { [key]: handler } as Partial<Hooks>;
}
