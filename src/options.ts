import type { OptionValidationContext } from "@docusaurus/types";
import type { PluginOptions } from "./types";

export function validateOptions({
  options,
}: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  if (!options.reviewsDir || typeof options.reviewsDir !== "string") {
    throw new Error(
      "docusaurus-plugin-review-comments: 'reviewsDir' option is required",
    );
  }
  if (!options.defaultAuthor || typeof options.defaultAuthor !== "string") {
    throw new Error(
      "docusaurus-plugin-review-comments: 'defaultAuthor' option is required",
    );
  }
  if (options.reviewService !== undefined) {
    const rs = options.reviewService;
    if (
      rs.intervalMs !== undefined &&
      (typeof rs.intervalMs !== "number" || rs.intervalMs <= 0)
    ) {
      throw new Error(
        "docusaurus-plugin-review-comments: 'reviewService.intervalMs' must be a positive number",
      );
    }
    if (
      rs.agentCommand !== undefined &&
      typeof rs.agentCommand !== "string" &&
      typeof rs.agentCommand !== "function"
    ) {
      throw new Error(
        "docusaurus-plugin-review-comments: 'reviewService.agentCommand' must be a string or function",
      );
    }
    if (rs.contextDirs !== undefined) {
      if (
        !Array.isArray(rs.contextDirs) ||
        rs.contextDirs.some((d) => typeof d !== "string" || !d)
      ) {
        throw new Error(
          "docusaurus-plugin-review-comments: 'reviewService.contextDirs' must be an array of non-empty strings",
        );
      }
    }
  }
  return options as PluginOptions;
}
