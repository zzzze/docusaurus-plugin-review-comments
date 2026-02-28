import { describe, it, expect } from "vitest";
import { validateOptions } from "../options";

function callValidate(options: Record<string, unknown>) {
  return validateOptions({
    options,
    validate: (_, opts) => opts,
  } as Parameters<typeof validateOptions>[0]);
}

describe("validateOptions", () => {
  it("returns valid options unchanged", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
    });
    expect(result).toEqual({ reviewsDir: "./.reviews", reviewerName: "reviewer" });
  });

  it("throws when reviewsDir is missing", () => {
    expect(() => callValidate({ reviewerName: "reviewer" })).toThrow(
      "'reviewsDir' option is required",
    );
  });

  it("throws when reviewsDir is empty string", () => {
    expect(() =>
      callValidate({ reviewsDir: "", reviewerName: "reviewer" }),
    ).toThrow("'reviewsDir' option is required");
  });

  it("throws when reviewsDir is not a string", () => {
    expect(() =>
      callValidate({ reviewsDir: 123, reviewerName: "reviewer" }),
    ).toThrow("'reviewsDir' option is required");
  });

  it("throws when reviewerName is missing", () => {
    expect(() => callValidate({ reviewsDir: "./.reviews" })).toThrow(
      "'reviewerName' option is required",
    );
  });

  it("throws when reviewerName is empty string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", reviewerName: "" }),
    ).toThrow("'reviewerName' option is required");
  });

  it("throws when reviewerName is not a string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", reviewerName: 42 }),
    ).toThrow("'reviewerName' option is required");
  });

  it("accepts agentName as a non-empty string", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      agentName: "Gemini",
    });
    expect(result.agentName).toBe("Gemini");
  });

  it("accepts missing agentName (optional)", () => {
    const result = callValidate({ reviewsDir: "./.reviews", reviewerName: "reviewer" });
    expect(result.agentName).toBeUndefined();
  });

  it("throws when agentName is empty string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", reviewerName: "reviewer", agentName: "" }),
    ).toThrow("'agentName' must be a non-empty string");
  });

  it("throws when agentName is not a string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", reviewerName: "reviewer", agentName: 42 }),
    ).toThrow("'agentName' must be a non-empty string");
  });
});

describe("validateOptions — reviewService", () => {
  it("accepts missing reviewService (optional)", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
    });
    expect(result.reviewService).toBeUndefined();
  });

  it("accepts empty reviewService object", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: {},
    });
    expect(result.reviewService).toEqual({});
  });

  it("accepts valid reviewService options with string agentCommand", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: {
        enabled: false,
        intervalMs: 30000,
        agentCommand: "my-agent -p",
        agentPromptFile: "/custom/AGENTS.md",
      },
    });
    expect(result.reviewService).toEqual({
      enabled: false,
      intervalMs: 30000,
      agentCommand: "my-agent -p",
      agentPromptFile: "/custom/AGENTS.md",
    });
  });

  it("accepts agentCommand as a function", () => {
    const fn = ({ reviewsDir, docsDirs }: { reviewsDir: string; docsDirs: string[] }) =>
      `claude --add-dir ${reviewsDir} ${docsDirs.map((d) => `--add-dir ${d}`).join(" ")} -p`;
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: { agentCommand: fn },
    });
    expect(typeof result.reviewService?.agentCommand).toBe("function");
  });

  it("throws when agentCommand is neither string nor function", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { agentCommand: 42 },
      }),
    ).toThrow("'reviewService.agentCommand' must be a string or function");
  });

  it("throws when reviewService.intervalMs is not a number", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { intervalMs: "fast" },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });

  it("throws when reviewService.intervalMs is zero or negative", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { intervalMs: 0 },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });

  it("accepts contextDirs as an array of strings (legacy format)", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: { contextDirs: ["../my-repo", "/abs/path"] },
    });
    expect(result.reviewService?.contextDirs).toEqual(["../my-repo", "/abs/path"]);
  });

  it("accepts contextDirs as an array of { dir, desc } objects", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: {
        contextDirs: [
          { dir: "../my-repo", desc: "plugin source code" },
          { dir: "/abs/path", desc: "usage examples" },
        ],
      },
    });
    expect(result.reviewService?.contextDirs).toEqual([
      { dir: "../my-repo", desc: "plugin source code" },
      { dir: "/abs/path", desc: "usage examples" },
    ]);
  });

  it("accepts contextDirs as a mixed array of strings and objects", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: {
        contextDirs: ["../my-repo", { dir: "/abs/path", desc: "usage examples" }],
      },
    });
    expect(result.reviewService?.contextDirs).toEqual([
      "../my-repo",
      { dir: "/abs/path", desc: "usage examples" },
    ]);
  });

  it("accepts contextDirs entries without desc", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      reviewerName: "reviewer",
      reviewService: { contextDirs: [{ dir: "../my-repo" }] },
    });
    expect(result.reviewService?.contextDirs).toEqual([{ dir: "../my-repo" }]);
  });

  it("throws when contextDirs is not an array", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { contextDirs: "../my-repo" },
      }),
    ).toThrow("'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects");
  });

  it("throws when contextDirs contains an invalid entry", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { contextDirs: [{ dir: "../ok" }, 42] },
      }),
    ).toThrow("'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects");
  });

  it("throws when contextDirs contains an empty string", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { contextDirs: [""] },
      }),
    ).toThrow("'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects");
  });

  it("throws when contextDirs contains an entry with empty dir", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { contextDirs: [{ dir: "" }] },
      }),
    ).toThrow("'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects");
  });

  it("throws when contextDirs contains an entry with missing dir", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        reviewerName: "reviewer",
        reviewService: { contextDirs: [{ desc: "no dir" }] },
      }),
    ).toThrow("'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects");
  });
});
