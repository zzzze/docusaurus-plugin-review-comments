#!/usr/bin/env node
// Copies static assets (e.g. CSS modules) from src/ to lib/ after tsc build.
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');
const LIB = path.resolve(__dirname, '../lib');

const ASSET_EXTENSIONS = new Set(['.css', '.svg', '.png', '.jpg', '.gif', '.json']);

function copyDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath);
    } else if (entry.isFile() && ASSET_EXTENSIONS.has(path.extname(entry.name))) {
      const rel = path.relative(SRC, srcPath);
      const destPath = path.join(LIB, rel);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`copied: ${rel}`);
    }
  }
}

copyDir(SRC);
