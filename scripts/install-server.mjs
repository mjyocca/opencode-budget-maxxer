#!/usr/bin/env node

/**
 * install-server.mjs - Register server plugin in opencode.json
 * 
 * This script adds the plugin directory path to the global opencode.json file,
 * preserving any existing configuration and comments.
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

console.log(`[server:install] config dir  : ${configDir}`)
console.log(`[server:install] workspace   : ${workspace}`)
console.log()

// Ensure config directory exists
if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true })
}

// Determine which config file to use (prefer jsonc if it exists, otherwise json)
let configPath = configPathJson
if (existsSync(configPathJsonc)) {
  configPath = configPathJsonc
}

console.log(`[server:install] config file : ${configPath}`)
console.log()

// Read or create config
let config = {}
let fileExists = false

if (existsSync(configPath)) {
  try {
    const content = readFileSync(configPath, 'utf-8')
    config = parse(content)
    fileExists = true
  } catch (err) {
    console.error(`❌ Failed to parse ${configPath}: ${err.message}`)
    process.exit(1)
  }
}

// Ensure plugin array exists
if (!config.plugin) {
  config.plugin = []
}

if (!Array.isArray(config.plugin)) {
  console.error('❌ config.plugin is not an array')
  process.exit(1)
}

// Check if workspace is already in the plugin array
const workspaceEntry = workspace
const alreadyExists = config.plugin.some(entry => {
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
  console.log('ℹ️  Server plugin already registered, skipping.')
  process.exit(0)
}

// Add workspace to plugin array
config.plugin.push(workspaceEntry)

// Write back to file with comment preservation
try {
  const output = stringify(config, null, 2)
  writeFileSync(configPath, output + '\n', 'utf-8')
  
  if (fileExists) {
    console.log(`✅ Updated ${configPath}`)
  } else {
    console.log(`✅ Created ${configPath}`)
  }
  console.log(`   Added: "${workspaceEntry}"`)
} catch (err) {
  console.error(`❌ Failed to write ${configPath}: ${err.message}`)
  process.exit(1)
}
