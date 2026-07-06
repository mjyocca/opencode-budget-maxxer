import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function setup() {
  const testHome = join(tmpdir(), `opencode-test-${Date.now()}`);
  mkdirSync(testHome, { recursive: true });
  mkdirSync(join(testHome, ".local", "share", "opencode"), { recursive: true });
  mkdirSync(join(testHome, ".config", "opencode"), { recursive: true });
  mkdirSync(join(testHome, ".cache", "opencode"), { recursive: true });
  mkdirSync(join(testHome, ".local", "state", "opencode"), { recursive: true });
  writeFileSync(join(testHome, ".local", "share", "opencode", "auth.json"), "{}");
  process.env.OPENCODE_TEST_HOME = testHome;
  process.env.XDG_DATA_HOME = join(testHome, ".local", "share");
  process.env.XDG_CONFIG_HOME = join(testHome, ".config");
  process.env.XDG_CACHE_HOME = join(testHome, ".cache");
  process.env.XDG_STATE_HOME = join(testHome, ".local", "state");
  process.env.HOME = testHome;
}

export function teardown() {
  if (process.env.OPENCODE_TEST_HOME) {
    rmSync(process.env.OPENCODE_TEST_HOME, { recursive: true, force: true });
  }
}
