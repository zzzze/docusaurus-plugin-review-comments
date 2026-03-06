import path from "node:path";
import type { DocusaurusConfig } from "@docusaurus/types";

interface DocsPluginOptions {
  path?: string;
  routeBasePath?: string;
  id?: string;
}

/**
 * Builds a map from URL routeBasePath to filesystem path for all
 * @docusaurus/plugin-content-docs instances found in siteConfig.
 */
export function buildDocsPathMap(
  siteConfig: DocusaurusConfig,
): Map<string, string> {
  const map = new Map<string, string>();

  // Scan plugins array
  for (const plugin of siteConfig.plugins ?? []) {
    extractFromPluginEntry(plugin, map);
  }

  // Scan presets array
  for (const preset of siteConfig.presets ?? []) {
    if (!Array.isArray(preset)) continue;
    const [presetName, presetOptions] = preset;
    if (
      typeof presetName === "string" &&
      (presetName === "classic" || presetName.includes("preset-classic")) &&
      presetOptions &&
      typeof presetOptions === "object"
    ) {
      const opts = presetOptions as Record<string, unknown>;
      if (opts.docs && typeof opts.docs === "object") {
        addDocsEntry(opts.docs as DocsPluginOptions, map);
      }
    }
  }

  return map;
}

function extractFromPluginEntry(
  plugin: unknown,
  map: Map<string, string>,
): void {
  if (!Array.isArray(plugin)) return;
  const [pluginName, pluginOptions] = plugin;
  if (
    typeof pluginName === "string" &&
    pluginName.includes("plugin-content-docs")
  ) {
    addDocsEntry((pluginOptions ?? {}) as DocsPluginOptions, map);
  }
}

function addDocsEntry(opts: DocsPluginOptions, map: Map<string, string>): void {
  const fsPath = opts.path ?? "docs";
  const routeBase = opts.routeBasePath ?? "docs";
  map.set(routeBase, fsPath);
}

/**
 * Resolves a documentPath (e.g. "docs/intro") to an absolute .md file path.
 * Uses the routeBasePath→fsPath map; falls back to using documentPath directly.
 */
export function resolveDocSourcePath(
  siteDir: string,
  docsPathMap: Map<string, string>,
  documentPath: string,
): string {
  const segments = documentPath.split("/");
  const routeBase = segments[0] ?? "";
  const rest = segments.slice(1).join("/");

  const fsBase = docsPathMap.get(routeBase) ?? routeBase;
  return path.join(siteDir, fsBase, rest + ".md");
}
