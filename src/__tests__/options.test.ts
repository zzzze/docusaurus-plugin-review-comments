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
