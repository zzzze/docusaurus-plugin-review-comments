import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const PACKAGE_VERSION: string = require("../package.json").version;

export interface SetupOptions {
  docsPath: string;
  reviewsDir: string;
  userName: string;
  agent: boolean;
  port: number;
  cleanCache: boolean;
}

export function getCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(base, "docusaurus-review-cli");
}

export function ensureCache(cacheDir: string, cleanCache: boolean): void {
  const versionFile = path.join(cacheDir, ".version");

  if (cleanCache && fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }

  const needsInstall = !fs.existsSync(versionFile) ||
    fs.readFileSync(versionFile, "utf-8").trim() !== PACKAGE_VERSION;

  if (needsInstall) {
    const templateDir = path.join(__dirname, "../template");
    // Remove stale lockfile before copying template to avoid resolution conflicts
    const lockFile = path.join(cacheDir, "package-lock.json");
    try { fs.unlinkSync(lockFile); } catch { /* ignore if missing */ }
    fs.cpSync(templateDir, cacheDir, { recursive: true, force: true });

    console.log("Installing dependencies (first run or version changed)...");
    try {
      execFileSync("npm", ["install", "--prefer-offline"], {
        cwd: cacheDir,
        stdio: "inherit",
      });
    } catch {
      execFileSync("npm", ["install"], {
        cwd: cacheDir,
        stdio: "inherit",
      });
    }

    fs.writeFileSync(versionFile, PACKAGE_VERSION);
  }
}

export function linkDocs(cacheDir: string, docsPath: string): void {
  const target = path.join(cacheDir, "docs");
  try { fs.rmSync(target, { recursive: true, force: true }); } catch { /* ignore */ }

  // Create a real directory and symlink each entry from the user's docs
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(docsPath)) {
    if (entry.startsWith(".")) continue;
    fs.symlinkSync(path.join(docsPath, entry), path.join(target, entry));
  }

  // Generate an index page if the user's docs don't have one
  const hasIndex = fs.readdirSync(docsPath)
    .some((f) => /^index\.(md|mdx)$/i.test(f));
  if (!hasIndex) {
    fs.writeFileSync(path.join(target, "index.md"), `---
slug: /
title: Documents
displayed_sidebar: docsSidebar
---

# Documents

Use the sidebar to navigate documents.
`);
  }
}

export function unlinkDocs(cacheDir: string): void {
  const target = path.join(cacheDir, "docs");
  try { fs.rmSync(target, { recursive: true, force: true }); } catch { /* ignore */ }
}

export function generateConfig(cacheDir: string, opts: SetupOptions): void {
  const escaped = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const reviewsDir = escaped(opts.reviewsDir);
  const userName = escaped(opts.userName);

  const pluginOpts = opts.agent
    ? `{ reviewsDir: '${reviewsDir}', userName: '${userName}', reviewService: { enabled: true } }`
    : `{ reviewsDir: '${reviewsDir}', userName: '${userName}' }`;

  const config = `import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Document Review',
  tagline: 'Review comments',
  url: 'http://localhost',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  future: { v4: true },
  markdown: { format: 'detect' },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    ['classic', {
      docs: { routeBasePath: '/', sidebarPath: './sidebars.ts' },
      blog: false,
      theme: { customCss: './src/css/custom.css' },
    } satisfies Preset.Options],
  ],
  plugins: [
    function () {
      return {
        name: 'fix-cjs-theme',
        configureWebpack(config: any) {
          // The plugin ships CJS-compiled theme files. Docusaurus's Babel
          // preset uses useESModules:true in @babel/plugin-transform-runtime,
          // which injects ESM \`import\` helpers into CJS files. Webpack then
          // misclassifies the module as ESM, leaving \`exports\` undefined.
          // Fix: exclude the plugin's compiled CJS theme/client files from
          // the Babel loader so webpack correctly handles them as CJS.
          const jsRule = config.module?.rules?.find(
            (r: any) => r?.test?.toString?.().includes('jt')
          );
          if (jsRule) {
            const origExclude = jsRule.exclude;
            jsRule.exclude = (p: string) => {
              if (/docusaurus-plugin-review-comments[\\\\/]lib[\\\\/](theme|client)/.test(p)) return true;
              return typeof origExclude === 'function' ? origExclude(p) : false;
            };
          }
          // Docs are symlinked into the cache directory. By default webpack
          // resolves symlinks to their real paths, which fall outside the
          // cache dir and miss the MDX loader \`include\` rule. Disabling
          // symlink resolution keeps paths within the cache dir so the
          // plugin-content-docs MDX loader matches them correctly.
          return { resolve: { symlinks: false } };
        },
      };
    },
    ['docusaurus-plugin-review-comments', ${pluginOpts}],
  ],
  themeConfig: {
    navbar: { title: 'Document Review', items: [] },
    colorMode: { respectPrefersColorScheme: true },
  } satisfies Preset.ThemeConfig,
};

export default config;
`;
  fs.writeFileSync(path.join(cacheDir, "docusaurus.config.ts"), config);
}

export function generateSidebars(cacheDir: string, docsPath: string): void {
  const items = scanDocsDir(docsPath, "");
  const content = `import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: ${JSON.stringify(items, null, 2)},
};

export default sidebars;
`;
  fs.writeFileSync(path.join(cacheDir, "sidebars.ts"), content);
}

function scanDocsDir(basePath: string, relativePath: string): unknown[] {
  const dirPath = relativePath ? path.join(basePath, relativePath) : basePath;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items: unknown[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subItems = scanDocsDir(basePath, relPath);
      if (subItems.length > 0) {
        items.push({ type: "category", label: entry.name, items: subItems, link: { type: "generated-index" as const } });
      }
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      items.push(relPath.replace(/\.(md|mdx)$/i, ""));
    }
  }

  return items;
}
