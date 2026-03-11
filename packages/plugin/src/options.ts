import type { OptionValidationContext } from "@docusaurus/types";
import type { PluginOptions } from "./types";

export function validateOptions({
  options,
}: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  if (!options.reviewsDir || typeof options.reviewsDir !== "string") {
    throw new Error(
      "docusaurus-plugin-mdreview: 'reviewsDir' option is required",
    );
  }
  if (!options.userName || typeof options.userName !== "string") {
    throw new Error(
      "docusaurus-plugin-mdreview: 'userName' option is required",
    );
  }
  if (options.agentName !== undefined && (typeof options.agentName !== "string" || !options.agentName)) {
    throw new Error(
      "docusaurus-plugin-mdreview: 'agentName' must be a non-empty string",
    );
  }
  if (options.reviewService !== undefined) {
    const rs = options.reviewService;
    if (
      rs.intervalMs !== undefined &&
      (typeof rs.intervalMs !== "number" || rs.intervalMs <= 0)
    ) {
      throw new Error(
        "docusaurus-plugin-mdreview: 'reviewService.intervalMs' must be a positive number",
      );
    }
    if (
      rs.agentCommand !== undefined &&
      typeof rs.agentCommand !== "string" &&
      typeof rs.agentCommand !== "function"
    ) {
      throw new Error(
        "docusaurus-plugin-mdreview: 'reviewService.agentCommand' must be a string or function",
      );
    }
    if (rs.contextDirs !== undefined) {
      if (
        !Array.isArray(rs.contextDirs) ||
        rs.contextDirs.some((d) => {
          if (typeof d === "string") return !d;
          return (
            typeof d !== "object" ||
            d === null ||
            typeof d.dir !== "string" ||
            !d.dir
          );
        })
      ) {
        throw new Error(
          "docusaurus-plugin-mdreview: 'reviewService.contextDirs' must be an array of strings or { dir: string; desc?: string } objects",
        );
      }
    }
    if (rs.env !== undefined) {
      if (
        typeof rs.env !== "object" ||
        rs.env === null ||
        Array.isArray(rs.env) ||
        Object.values(rs.env).some((v) => typeof v !== "string")
      ) {
        throw new Error(
          "docusaurus-plugin-mdreview: 'reviewService.env' must be a Record<string, string>",
        );
      }
    }
  }
  return options as PluginOptions;
}
