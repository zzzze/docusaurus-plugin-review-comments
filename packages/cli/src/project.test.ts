import { describe, it, expect } from "vitest";
import { findProjectRoot, getProjectNamespace } from "./project";
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
