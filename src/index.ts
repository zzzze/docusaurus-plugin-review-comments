import type { LoadContext, Plugin } from "@docusaurus/types";
import type { PluginOptions } from "./types";
import path from "node:path";
import { createReviewsMiddleware } from "./api/reviews";

export { validateOptions } from "./options";

export default function pluginReviewComments(
  context: LoadContext,
  options: PluginOptions,
): Plugin {
  const resolvedReviewsDir = path.resolve(context.siteDir, options.reviewsDir);

  return {
    name: "docusaurus-plugin-review-comments",

    getThemePath() {
      return path.resolve(__dirname, "./theme");
    },

    getClientModules() {
      return [path.resolve(__dirname, "./client/styles.css")];
    },

    getPathsToWatch() {
      return [`${resolvedReviewsDir}/**/*.reviews.json`];
    },

    configureWebpack() {
      return {
        devServer: {
          setupMiddlewares(middlewares: unknown[], devServer: unknown) {
            const app = (devServer as { app: import("express").Express }).app;
            createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor);
            return middlewares;
          },
        },
      };
    },
  };
}
