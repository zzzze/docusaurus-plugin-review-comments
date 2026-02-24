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
  return options as PluginOptions;
}
