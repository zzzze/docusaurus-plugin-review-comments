import { describe, it, expect } from "vitest";
import { findProjectRoot, getProjectNamespace, getDefaultReviewsDir } from "./project";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

describe("findProjectRoot", () => {
  it("returns git root for a directory inside a git repo", () => {
    // This test file itself is inside a git repo
    const root = findProjectRoot(__dirname);
    expect(root).toBeTruthy();
    expect(fs.existsSync(path.join(root!, ".git"))).toBe(true);
  });

  it("returns undefined for a directory outside any git repo", () => {
    const root = findProjectRoot(os.tmpdir());
    expect(root).toBeUndefined();
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
