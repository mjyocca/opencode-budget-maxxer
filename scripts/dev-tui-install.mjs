#!/usr/bin/env node
/**
 * Minimal helper: adds workspace to ~./config/opencode/tui.json
 * if not already present. Does NOT remove.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const { HOME, USERPROFILE } = process.env
const home = HOME || USERPROFILE || ''
if (!home) {
  console.error('❌ Cannot detect HOME directory.')
  process.exit(1)
}

const workspace = process.cwd()
const tuiConfigPath = resolve(home, '.config', 'opencode', 'tui.json')
const workspaceAbs = resolve(workspace)

console.log(`[tui:install] workspace   : ${workspace}`)
console.log(`[tui:install] tui config  : ${tuiConfigPath}\n`)

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

// Try as array first (tui.json arrays), then as object
let data = []
let isArray = true

if (existsSync(tuiConfigPath)) {
  try {
    const raw = readFileSync(tuiConfigPath, 'utf-8')
    const firstNonSpace = raw.trimStart()[0]
    let parsed
    if (firstNonSpace === '[') {
      parsed = parseJSONC(tuiConfigPath)
      isArray = true
    } else {
      parsed = parseJSONC(tuiConfigPath)
      isArray = false
      if (isArray && typeof parsed === 'object' && parsed.plugin) {
        // unwrap { plugin: [...] } to just the array
        data = [...parsed.plugin]
      }
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      data = [...parsed]
      isArray = true
    } else if (parsed && typeof parsed === 'object') {
      // Might be { plugin: [...] }
      if (!Array.isArray(parsed) && parsed?.plugin && Array.isArray(parsed.plugin)) {
        data = [...parsed.plugin]
        isArray = false
      }
    }
  } catch {
    // File exists but is invalid — start fresh
    data = []
  }
}

if (!data.includes(workspaceAbs)) {
  data.push(workspaceAbs)
  
  if (isArray) {
    writeJSON(tuiConfigPath, data)
    console.log(`✅ Added workspace to ${tuiConfigPath}`)
    console.log(`   "${workspaceAbs}"\n`)
  } else {
    // Re-wrap as { plugin: [...] }
    const existing = existsSync(tuiConfigPath) && parseJSONC(tuiConfigPath)
    writeJSON(tuiConfigPath, { ...existing, plugin: data })
    console.log(`✅ Added workspace to ${tuiConfigPath}\n`)
  }
} else {
  console.log('ℹ️  Already in tui.json, skipping.\n')
}
