import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sourcePath = path.join(rootDir, 'src', 'tui.tsx')
const distSourcePath = path.join(rootDir, 'dist', 'tui.tsx')
const distJsxPath = path.join(rootDir, 'dist', 'tui.jsx')
const distJsxMapPath = path.join(rootDir, 'dist', 'tui.jsx.map')
const distJsxDeclPath = path.join(rootDir, 'dist', 'tui.d.ts')
const distJsxDeclMapPath = path.join(rootDir, 'dist', 'tui.d.ts.map')

// Copy src/tui.tsx to dist/tui.tsx (raw, no compilation — TUI runtime transforms JSX)
await fs.copyFile(sourcePath, distSourcePath)

// Remove .jsx artifacts that tsc may have generated
await fs.rm(distJsxPath, { force: true })
await fs.rm(distJsxMapPath, { force: true })

// Remove .d.ts artifacts for tui (types are preserved but TUI runtime needs .tsx)
// Keep tui.d.ts if it was generated — it's referenced in exports
