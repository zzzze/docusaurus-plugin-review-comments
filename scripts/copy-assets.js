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

// Copy CLI template directory (all files, not just assets)
const CLI_TEMPLATE_SRC = path.resolve(__dirname, '../src/cli/template');
const CLI_TEMPLATE_LIB = path.resolve(__dirname, '../lib/cli/template');
if (fs.existsSync(CLI_TEMPLATE_SRC)) {
  fs.cpSync(CLI_TEMPLATE_SRC, CLI_TEMPLATE_LIB, { recursive: true });
  console.log('copied: cli/template/ (all files)');
}

// Ensure CLI entry point has shebang
const cliEntry = path.resolve(__dirname, '../lib/cli/index.js');
if (fs.existsSync(cliEntry)) {
  const content = fs.readFileSync(cliEntry, 'utf-8');
  if (!content.startsWith('#!')) {
    fs.writeFileSync(cliEntry, '#!/usr/bin/env node\n' + content);
    console.log('added shebang to cli/index.js');
  }
}
