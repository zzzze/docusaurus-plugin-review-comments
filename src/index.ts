import type { LoadContext, Plugin } from "@docusaurus/types";
import type { PluginOptions } from "./types";
import path from "node:path";
import { createReviewsMiddleware } from "./api/reviews";
import { createReviewService } from "./service/index";
import { createSseNotifier } from "./api/sseNotifier";

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

            const rs = options.reviewService;
            if (rs !== undefined && rs.enabled !== false) {
              const notifier = createSseNotifier();
              const { tick } = createReviewService({
                siteDir: context.siteDir,
                reviewsDir: resolvedReviewsDir,
                siteConfig: context.siteConfig,
                intervalMs: rs?.intervalMs,
                agentCommand: rs?.agentCommand,
                agentPromptFile: rs?.agentPromptFile,
                contextDirs: rs?.contextDirs?.map((d) =>
                  path.resolve(context.siteDir, d),
                ),
                notifier,
              });
              createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor, tick, notifier);
            } else {
              createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor);
            }

            return middlewares;
          },
        },
      };
    },
  };
}
