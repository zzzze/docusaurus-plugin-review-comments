import { describe, it, expect } from "vitest";
import { findProjectRoot, getProjectNamespace, getDefaultReviewsDir } from "./project";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

describe("findProjectRoot", () => {
  it("returns git root for a directory inside a git repo", () => {
    // Pass a cwd above the git root so the search isn't bounded too early
    const root = findProjectRoot(__dirname, "/");
    expect(fs.existsSync(path.join(root, ".git"))).toBe(true);
  });

  it("does not search above cwd", () => {
    // Use a cwd that is below the actual git root so .git won't be found
    const root = findProjectRoot(__dirname, __dirname);
    expect(root).toBe(path.resolve(__dirname));
  });

  it("falls back to cwd when no .git exists", () => {
    const tmp = os.tmpdir();
    const root = findProjectRoot(tmp, tmp);
    expect(root).toBe(path.resolve(tmp));
  });
});

describe("getProjectNamespace", () => {
  it("returns basename-hash format", () => {
    const ns = getProjectNamespace("/Users/vin/code/my-project");
    expect(ns).toMatch(/^my-project-[a-f0-9]{8}$/);
  });

  it("returns same value for same path", () => {
    const a = getProjectNamespace("/some/path");
    const b = getProjectNamespace("/some/path");
    expect(a).toBe(b);
  });

  it("returns different values for different paths", () => {
    const a = getProjectNamespace("/path/a");
    const b = getProjectNamespace("/path/b");
    expect(a).not.toBe(b);
  });
});

describe("getDefaultReviewsDir", () => {
  it("returns path under ~/.mdreview/reviews/ with namespace and docsRelPath", () => {
    const result = getDefaultReviewsDir({
      docsPath: "/Users/vin/code/my-project/docs",
      projectRoot: "/Users/vin/code/my-project",
    });
    expect(result).toMatch(/^.*\/\.mdreview\/reviews\/my-project-[a-f0-9]{8}\/docs$/);
  });

  it("omits docsRelPath when docsPath equals projectRoot", () => {
    const result = getDefaultReviewsDir({
      docsPath: "/Users/vin/code/my-project",
      projectRoot: "/Users/vin/code/my-project",
    });
    expect(result).toMatch(/^.*\/\.mdreview\/reviews\/my-project-[a-f0-9]{8}$/);
  });

  it("handles nested docs paths", () => {
    const result = getDefaultReviewsDir({
      docsPath: "/Users/vin/code/proj/src/docs",
      projectRoot: "/Users/vin/code/proj",
    });
    expect(result).toMatch(/\/src\/docs$/);
  });
});
