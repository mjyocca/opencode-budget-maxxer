#!/usr/bin/env node

/**
 * install-tui.mjs - Register TUI plugin in tui.json with comment preservation
 * 
 * This script adds the plugin workspace path to tui.json, preserving any
 * existing comments in the file.
 */

import { parse, stringify } from 'comment-json'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
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

console.log(`[tui:install] config dir  : ${configDir}`)
console.log(`[tui:install] tui config  : ${tuiConfigPath}`)
console.log(`[tui:install] workspace   : ${workspace}`)
console.log()

// Ensure config directory exists
if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true })
}

// Read or create tui.json
let config = {}
let fileExists = false

if (existsSync(tuiConfigPath)) {
  try {
    const content = readFileSync(tuiConfigPath, 'utf-8')
    config = parse(content)
    fileExists = true
  } catch (err) {
    console.error(`❌ Failed to parse tui.json: ${err.message}`)
    process.exit(1)
  }
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
    // Object exists but no plugin array yet
    pluginArray = []
    config.plugin = pluginArray
    isArrayFormat = false
  }
} else {
  // Empty or invalid config, start fresh
  pluginArray = []
  isArrayFormat = true
}

// Check if workspace is already in the array
const workspaceEntry = workspace
const alreadyExists = pluginArray.some(entry => {
  if (typeof entry === 'string') {
    return entry === workspaceEntry
  }
  if (Array.isArray(entry) && entry.length > 0) {
    // Tuple format: ["path", { options }]
    return entry[0] === workspaceEntry
  }
  return false
})

if (alreadyExists) {
  console.log('ℹ️  TUI plugin already registered, skipping.')
  process.exit(0)
}

// Add workspace to plugin array
pluginArray.push(workspaceEntry)

// Write back to file with comment preservation
try {
  const output = isArrayFormat 
    ? stringify(pluginArray, null, 2) 
    : stringify(config, null, 2)
  
  writeFileSync(tuiConfigPath, output + '\n', 'utf-8')
  
  if (fileExists) {
    console.log(`✅ Updated ${tuiConfigPath}`)
  } else {
    console.log(`✅ Created ${tuiConfigPath}`)
  }
  console.log(`   Added: "${workspaceEntry}"`)
} catch (err) {
  console.error(`❌ Failed to write tui.json: ${err.message}`)
  process.exit(1)
}
