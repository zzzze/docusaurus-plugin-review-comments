#!/usr/bin/env node
// Copies static assets (e.g. CSS modules) from src/ to lib/ after tsc build.
// Also copies theme source (TSX/CSS) to lib/theme-src/ so Docusaurus webpack
// can process them instead of the CJS-compiled versions.
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

// Copy client-side source files (theme, client, types) for Docusaurus webpack.
// These must be raw TSX/TS — not CJS-compiled — because Docusaurus webpack processes them.
const CLIENT_DIRS = ['theme', 'client'];
const CLIENT_FILES = ['types.ts'];
const SRC_MIRROR = path.join(LIB, 'src');

function copyTree(srcDir, destDir) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

for (const dir of CLIENT_DIRS) {
  const s = path.join(SRC, dir);
  if (fs.existsSync(s)) {
    copyTree(s, path.join(SRC_MIRROR, dir));
    console.log(`src-mirror: ${dir}/`);
  }
}
for (const file of CLIENT_FILES) {
  const s = path.join(SRC, file);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, path.join(SRC_MIRROR, file));
    console.log(`src-mirror: ${file}`);
  }
}
