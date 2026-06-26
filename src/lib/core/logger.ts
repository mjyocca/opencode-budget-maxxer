import type { PluginInput } from "@opencode-ai/plugin";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";

type Client = PluginInput["client"];
type LogLevel = "info" | "warn" | "error" | "debug";
type LogMetadata = Record<string, unknown>;

export interface Logger {
  info: (msg: string, extra?: LogMetadata) => Promise<void>;
  warn: (msg: string, extra?: LogMetadata) => Promise<void>;
  error: (msg: string, extra?: LogMetadata) => Promise<void>;
  debug: (msg: string, extra?: LogMetadata) => Promise<void>;
}

/**
 * Creates an SDK-based logger that uses client.app.log() for structured logging.
 * Use this for server plugins where client is available.
 */
export function createSdkLogger(client: Client, pluginId: string): Logger {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false;

  const log = async (
    level: LogLevel,
    msg: string,
    extra?: LogMetadata,
  ): Promise<void> => {
    // Filter debug logs unless explicitly enabled
    if (level === "debug" && !DEBUG) return;

    await client.app.log({
      body: {
        service: pluginId,
        level,
        message: msg,
        extra: extra ?? {},
      },
    });
  };

  return {
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  };
}

/**
 * Creates an SDK-based logger for TUI plugins where client may not be available.
 * Uses api.client.app.log() when available (no stderr output visible in UI).
 * Silently discards logs when the SDK client is not available.
 *
 * When the DEBUG env var is set to "1", also writes to stderr for verification
 * during development.
 */
export function createTuiLogger(
  api: TuiPluginApi,
  pluginId: string,
): Omit<Logger, "info" | "warn" | "error" | "debug"> & {
  info: (msg: string, extra?: Record<string, unknown>) => void;
  warn: (msg: string, extra?: Record<string, unknown>) => void;
  error: (msg: string, extra?: Record<string, unknown>) => void;
  debug: (msg: string, extra?: Record<string, unknown>) => void;
} {
  const DEBUG = process.env.OPENCODE_LOG_LEVEL == "DEBUG" ? true : false;

  const log = (
    level: LogLevel,
    msg: string,
    extra?: Record<string, unknown>,
  ) => {
    // Filter debug logs unless explicitly enabled
    if (level === "debug" && !DEBUG) return;

    void api.client.app.log({
      service: pluginId,
      level: level,
      message: msg,
      extra: extra,
    });
  };

  return {
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => log("debug", msg, extra),
  };
}
