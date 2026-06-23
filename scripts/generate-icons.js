#!/usr/bin/env node
/**
 * Generate PWA icons from icon.svg using sharp.
 * Run: node scripts/generate-icons.js
 * Requires: npm install -g sharp-cli  OR  pnpm add -D sharp in apps/web
 */
const path = require('path')
const fs = require('fs')

const publicDir = path.join(__dirname, '..', 'apps', 'web', 'public')
const svgPath = path.join(publicDir, 'icon.svg')

if (!fs.existsSync(svgPath)) {
  console.error('icon.svg not found at', svgPath)
  process.exit(1)
}

let sharp
try {
  sharp = require('sharp')
} catch {
  console.error(
    'sharp not installed.\n' +
    'Run: pnpm add -D sharp --filter @payeshyadman/web\n' +
    'Then re-run: node scripts/generate-icons.js'
  )
  process.exit(1)
}

async function generate() {
  const sizes = [192, 512]
  for (const size of sizes) {
    const out = path.join(publicDir, `icon-${size}.png`)
    await sharp(svgPath).resize(size, size).png().toFile(out)
    console.log(`Created ${out}`)
  }
  console.log('Done. PWA icons generated.')
}

generate().catch(e => { console.error(e); process.exit(1) })
