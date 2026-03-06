#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Ensure CLI entry point has shebang
const cliEntry = path.resolve(__dirname, '../lib/index.js');
if (fs.existsSync(cliEntry)) {
  const content = fs.readFileSync(cliEntry, 'utf-8');
  if (!content.startsWith('#!')) {
    fs.writeFileSync(cliEntry, '#!/usr/bin/env node\n' + content);
    console.log('added shebang to lib/index.js');
  }
}
