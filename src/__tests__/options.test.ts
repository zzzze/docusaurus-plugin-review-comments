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
      defaultAuthor: "reviewer",
    });
    expect(result).toEqual({ reviewsDir: "./.reviews", defaultAuthor: "reviewer" });
  });

  it("throws when reviewsDir is missing", () => {
    expect(() => callValidate({ defaultAuthor: "reviewer" })).toThrow(
      "'reviewsDir' option is required",
    );
  });

  it("throws when reviewsDir is empty string", () => {
    expect(() =>
      callValidate({ reviewsDir: "", defaultAuthor: "reviewer" }),
    ).toThrow("'reviewsDir' option is required");
  });

  it("throws when reviewsDir is not a string", () => {
    expect(() =>
      callValidate({ reviewsDir: 123, defaultAuthor: "reviewer" }),
    ).toThrow("'reviewsDir' option is required");
  });

  it("throws when defaultAuthor is missing", () => {
    expect(() => callValidate({ reviewsDir: "./.reviews" })).toThrow(
      "'defaultAuthor' option is required",
    );
  });

  it("throws when defaultAuthor is empty string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", defaultAuthor: "" }),
    ).toThrow("'defaultAuthor' option is required");
  });

  it("throws when defaultAuthor is not a string", () => {
    expect(() =>
      callValidate({ reviewsDir: "./.reviews", defaultAuthor: 42 }),
    ).toThrow("'defaultAuthor' option is required");
  });
});

describe("validateOptions — reviewService", () => {
  it("accepts missing reviewService (optional)", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
    });
    expect(result.reviewService).toBeUndefined();
  });

  it("accepts empty reviewService object", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
      reviewService: {},
    });
    expect(result.reviewService).toEqual({});
  });

  it("accepts valid reviewService options with string agentCommand", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
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
      defaultAuthor: "reviewer",
      reviewService: { agentCommand: fn },
    });
    expect(typeof result.reviewService?.agentCommand).toBe("function");
  });

  it("throws when agentCommand is neither string nor function", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { agentCommand: 42 },
      }),
    ).toThrow("'reviewService.agentCommand' must be a string or function");
  });

  it("throws when reviewService.intervalMs is not a number", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { intervalMs: "fast" },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });

  it("throws when reviewService.intervalMs is zero or negative", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { intervalMs: 0 },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });
});
