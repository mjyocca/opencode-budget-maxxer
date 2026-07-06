#!/usr/bin/env node

/**
 * uninstall-tui.mjs - Remove TUI plugin from tui.json with comment preservation
 * 
 * This script removes the plugin workspace path from tui.json, preserving any
 * existing comments in the file.
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
    if (process.env.XDG_CONFIG_HOME) {
      return `${process.env.XDG_CONFIG_HOME}/opencode`
    }
    return `${home}/.config/opencode`
  }
}

const configDir = getConfigDir()
const tuiConfigPath = resolve(configDir, 'tui.json')

console.log(`[tui:uninstall] config dir  : ${configDir}`)
console.log(`[tui:uninstall] tui config  : ${tuiConfigPath}`)
console.log(`[tui:uninstall] workspace   : ${workspace}`)
console.log()

// Check if tui.json exists
if (!existsSync(tuiConfigPath)) {
  console.log('ℹ️  tui.json not found, nothing to remove.')
  process.exit(0)
}

// Read tui.json
let config = {}
try {
  const content = readFileSync(tuiConfigPath, 'utf-8')
  config = parse(content)
} catch (err) {
  console.error(`❌ Failed to parse tui.json: ${err.message}`)
  process.exit(1)
}

// Handle both array format and object format
let pluginArray
let isArrayFormat = false

if (Array.isArray(config)) {
  // tui.json is a plain array: ["path1", "path2"]
  pluginArray = config
  isArrayFormat = true
} else if (config && typeof config === 'object') {
  // tui.json is an object, possibly with a plugin array
  if (Array.isArray(config.plugin)) {
    pluginArray = config.plugin
    isArrayFormat = false
  } else {
    // Object exists but no plugin array
    console.log('ℹ️  No plugin array found in tui.json, nothing to remove.')
    process.exit(0)
  }
} else {
  console.log('ℹ️  Invalid tui.json structure, nothing to remove.')
  process.exit(0)
}

// Check if workspace is in the array
const workspaceEntry = workspace
const initialLength = pluginArray.length

// Filter out the workspace entry
const filteredArray = pluginArray.filter(entry => {
  if (typeof entry === 'string') {
    return entry !== workspaceEntry
  }
  if (Array.isArray(entry) && entry.length > 0) {
    // Tuple format: ["path", { options }]
    return entry[0] !== workspaceEntry
  }
  return true
})

if (filteredArray.length === initialLength) {
  console.log('ℹ️  TUI plugin not found in tui.json, nothing to remove.')
  process.exit(0)
}

// Update the array
if (isArrayFormat) {
  // For array format, we need to mutate the original array
  config.length = 0
  config.push(...filteredArray)
} else {
  // For object format, update the plugin property
  config.plugin = filteredArray
}

// Write back to file with comment preservation
try {
  const output = isArrayFormat 
    ? stringify(config, null, 2) 
    : stringify(config, null, 2)
  
  writeFileSync(tuiConfigPath, output + '\n', 'utf-8')
  
  console.log(`✅ Updated ${tuiConfigPath}`)
  console.log(`   Removed: "${workspaceEntry}"`)
} catch (err) {
  console.error(`❌ Failed to write tui.json: ${err.message}`)
  process.exit(1)
}
