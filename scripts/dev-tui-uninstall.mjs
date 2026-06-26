#!/usr/bin/env node
/**
 * Removes workspace TUI plugin from ~/.config/opencode/tui.json
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { HOME, USERPROFILE } = process.env
const home = HOME || USERPROFILE || ''
if (!home) {
  console.error('❌ Cannot detect HOME directory.')
  process.exit(1)
}

const workspace = process.cwd()
const tuiConfigPath = resolve(home, '.config', 'opencode', 'tui.json')
const workspaceAbs = resolve(workspace)

console.log(`[tui:uninstall] workspace : ${workspace}`)
console.log(`[tui:uninstall] tui config : ${tuiConfigPath}\n`)

function parseJSONC(filepath) {
  const raw = readFileSync(filepath, 'utf-8')
  const cleaned = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(cleaned)
}

function writeJSON(filepath, data) {
  const raw = readFileSync(filepath, 'utf-8')
  const jsonStr = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(filepath, jsonStr, 'utf-8')
}

if (!existsSync(tuiConfigPath)) {
  console.log('t.json not found, nothing to remove.\n')
  process.exit(0)
}

let obj
let isArray

try {
  const parsed = parseJSONC(tuiConfigPath)
  const firstChar = parsed.toString()[0]
  if (Array.isArray(parsed)) {
    // Direct array: ["/path/to/plugin"]
    obj = parsed
    isArray = true
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.plugin)) {
    // Object shape: { "plugin": ["/path/to/plugin"] }
    obj = parsed.plugin
    isArray = false
  } else {
    console.log('t.json has unexpected structure, nothing to remove.\n')
    process.exit(0)
  }
} catch {
  console.error('Failed to parse tui.json')
  process.exit(1)
}

const before = obj.length
const filtered = obj.filter(p => p !== workspaceAbs)

if (filtered.length === before) {
  console.log(`not found in tui.json, nothing to remove.\n`)
  process.exit(0)
}

obj.length = 0
obj.push(...filtered)

if (isArray) {
  writeJSON(tuiConfigPath, obj)
  console.log(`Removed workspace from ${tuiConfigPath}`)
  console.log(`   "${workspaceAbs}"\n`)
} else {
  // obj is actually parsed.plugin, write the whole object back
  const existing = parseJSONC(tuiConfigPath)
  writeJSON(tuiConfigPath, { ...existing, plugin: obj })
  console.log(`Removed workspace from ${tuiConfigPath}\n`)
}
