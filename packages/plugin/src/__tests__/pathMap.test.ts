import { describe, it, expect } from "vitest";
import { buildDocsPathMap, resolveDocSourcePath } from "../service/pathMap";
import type { DocusaurusConfig } from "@docusaurus/types";

function makeConfig(
  plugins: unknown[] = [],
  presets: unknown[] = [],
): DocusaurusConfig {
  return {
    plugins,
    presets,
  } as unknown as DocusaurusConfig;
}

describe("buildDocsPathMap", () => {
  it("returns empty map for empty config", () => {
    const map = buildDocsPathMap(makeConfig());
    expect(map.size).toBe(0);
  });

  it("reads plugin-content-docs from plugins array (tuple form)", () => {
    const map = buildDocsPathMap(
      makeConfig([
        [
          "@docusaurus/plugin-content-docs",
          { path: "docs", routeBasePath: "docs" },
        ],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("uses default routeBasePath 'docs' when not specified", () => {
    const map = buildDocsPathMap(
      makeConfig([
        ["@docusaurus/plugin-content-docs", { path: "docs" }],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("uses default path 'docs' when not specified", () => {
    const map = buildDocsPathMap(
      makeConfig([["@docusaurus/plugin-content-docs", {}]]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("handles custom path and routeBasePath", () => {
    const map = buildDocsPathMap(
      makeConfig([
        [
          "@docusaurus/plugin-content-docs",
          { path: "api-content", routeBasePath: "api" },
        ],
      ]),
    );
    expect(map.get("api")).toBe("api-content");
  });

  it("reads plugin-content-docs from classic preset", () => {
    const map = buildDocsPathMap(
      makeConfig(
        [],
        [
          [
            "@docusaurus/preset-classic",
            { docs: { path: "docs", routeBasePath: "docs" } },
          ],
        ],
      ),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("reads plugin-content-docs from 'classic' short-name preset", () => {
    const map = buildDocsPathMap(
      makeConfig(
        [],
        [["classic", { docs: { path: "docs", routeBasePath: "docs" } }]],
      ),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("handles multiple docs instances", () => {
    const map = buildDocsPathMap(
      makeConfig([
        ["@docusaurus/plugin-content-docs", { path: "docs", routeBasePath: "docs" }],
        [
          "@docusaurus/plugin-content-docs",
          { id: "community", path: "community", routeBasePath: "community" },
        ],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
    expect(map.get("community")).toBe("community");
  });

  it("ignores non-docs plugins", () => {
    const map = buildDocsPathMap(
      makeConfig([["@docusaurus/plugin-content-blog", { path: "blog" }]]),
    );
    expect(map.size).toBe(0);
  });
});

describe("resolveDocSourcePath", () => {
  const siteDir = "/site";

  it("resolves documentPath using map", () => {
    const map = new Map([["docs", "docs"]]);
    expect(resolveDocSourcePath(siteDir, map, "docs/intro")).toBe(
      "/site/docs/intro.md",
    );
  });

  it("resolves with custom fsPath", () => {
    const map = new Map([["api", "api-content"]]);
    expect(resolveDocSourcePath(siteDir, map, "api/reference")).toBe(
      "/site/api-content/reference.md",
    );
  });

  it("falls back to documentPath directly when no map entry", () => {
    const map = new Map<string, string>();
    expect(resolveDocSourcePath(siteDir, map, "docs/intro")).toBe(
      "/site/docs/intro.md",
    );
  });
});
