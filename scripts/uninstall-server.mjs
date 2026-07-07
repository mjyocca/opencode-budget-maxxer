#!/usr/bin/env node

/**
 * uninstall-server.mjs - Remove server plugin from opencode.json
 * 
 * This script removes the plugin directory path from the global opencode.json file,
 * preserving any existing configuration and comments.
 */

import { parse, stringify } from 'comment-json'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspace = resolve(__dirname, '..')

// Detect platform-correct config directory
function getConfigDir() {
  // Check for OPENCODE_CONFIG_DIR override
  if (process.env.OPENCODE_CONFIG_DIR) {
    return process.env.OPENCODE_CONFIG_DIR
  }
  
  // Check for XDG_CONFIG_HOME (works on all platforms)
  if (process.env.XDG_CONFIG_HOME) {
    return `${process.env.XDG_CONFIG_HOME}/opencode`
  }
  
  const home = process.env.HOME || process.env.USERPROFILE || ''
  if (!home) {
    console.error('❌ Cannot detect HOME directory.')
    process.exit(1)
  }
  
  const platform = process.platform
  
  if (platform === 'darwin') {
    // macOS
    return `${home}/Library/Application Support/opencode`
  } else if (platform === 'win32') {
    // Windows
    return process.env.APPDATA 
      ? `${process.env.APPDATA}/opencode`
      : `${home}/.config/opencode`
  } else {
    // Linux and others
    return `${home}/.config/opencode`
  }
}

const configDir = getConfigDir()
const configPathJson = resolve(configDir, 'opencode.json')
const configPathJsonc = resolve(configDir, 'opencode.jsonc')

console.log(`[server:uninstall] config dir  : ${configDir}`)
console.log(`[server:uninstall] workspace   : ${workspace}`)
console.log()

// Determine which config file exists (prefer jsonc if it exists, otherwise json)
let configPath = configPathJson
if (existsSync(configPathJsonc)) {
  configPath = configPathJsonc
}

// Check if config file exists
if (!existsSync(configPath)) {
  console.log('ℹ️  No opencode.json found, nothing to remove.')
  process.exit(0)
}

console.log(`[server:uninstall] config file : ${configPath}`)
console.log()

// Read config
let config = {}
try {
  const content = readFileSync(configPath, 'utf-8')
  config = parse(content)
} catch (err) {
  console.error(`❌ Failed to parse ${configPath}: ${err.message}`)
  process.exit(1)
}

// Check if plugin array exists
if (!config.plugin || !Array.isArray(config.plugin)) {
  console.log('ℹ️  No plugin array found in config, nothing to remove.')
  process.exit(0)
}

// Check if workspace is in the plugin array
const workspaceEntry = workspace
const initialLength = config.plugin.length

// Filter out the workspace entry
config.plugin = config.plugin.filter(entry => {
  if (typeof entry === 'string') {
    return entry !== workspaceEntry
  }
  if (Array.isArray(entry) && entry.length > 0) {
    // Tuple format: ["path", { options }]
    return entry[0] !== workspaceEntry
  }
  return true
})

if (config.plugin.length === initialLength) {
  console.log('ℹ️  Server plugin not found in config, nothing to remove.')
  process.exit(0)
}

// Write back to file with comment preservation
try {
  const output = stringify(config, null, 2)
  writeFileSync(configPath, output + '\n', 'utf-8')
  
  console.log(`✅ Updated ${configPath}`)
  console.log(`   Removed: "${workspaceEntry}"`)
} catch (err) {
  console.error(`❌ Failed to write ${configPath}: ${err.message}`)
  process.exit(1)
}
