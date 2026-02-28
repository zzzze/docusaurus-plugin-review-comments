import type { LoadContext, Plugin } from "@docusaurus/types";
import type { PluginOptions, ContextDir } from "./types";
import path from "node:path";
import { createReviewsMiddleware } from "./api/reviews";
import { createReviewService, DEFAULT_INTERVAL_MS } from "./service/index";
import { buildDocsPathMap } from "./service/pathMap";
import { buildPrompt, buildGlobalPrompt, loadPromptTemplate } from "./service/prompt";
import { globReviewFiles, readReviewFile } from "./api/storage";
import { createSseNotifier } from "./api/sseNotifier";

export { validateOptions } from "./options";

export default function pluginReviewComments(
  context: LoadContext,
  options: PluginOptions,
): Plugin {
  if (process.env.NODE_ENV !== "development") {
    return { name: "docusaurus-plugin-review-comments" };
  }

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

    // @ts-expect-error webpack Configuration type does not include devServer, but Docusaurus handles it at runtime
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
                contextDirs: rs?.contextDirs,
                env: rs?.env,
                notifier,
              });
              createReviewsMiddleware(app, {
                reviewsDir: resolvedReviewsDir,
                defaultAuthor: options.defaultAuthor,
                onTrigger: tick,
                notifier,
                intervalMs: rs.intervalMs ?? DEFAULT_INTERVAL_MS,
              });
            } else {
              const docsPathMap = buildDocsPathMap(context.siteConfig);
              const contextDirs: ContextDir[] = (options.reviewService?.contextDirs ?? []).map((entry) => {
                const { dir, desc } = typeof entry === "string" ? { dir: entry, desc: undefined } : entry;
                return { dir: path.resolve(context.siteDir, dir), desc };
              });
              const agentPromptFile = options.reviewService?.agentPromptFile;
              createReviewsMiddleware(app, {
                reviewsDir: resolvedReviewsDir,
                defaultAuthor: options.defaultAuthor,
                getPrompt: async (docPath: string) => {
                  const template = await loadPromptTemplate(agentPromptFile);
                  return buildPrompt({ template, siteDir: context.siteDir, reviewsDir: resolvedReviewsDir, docsPathMap, documentPath: docPath, contextDirs });
                },
                getGlobalPrompt: async () => {
                  const files = await globReviewFiles(resolvedReviewsDir).catch(() => [] as string[]);
                  const pendingDocs: string[] = [];
                  for (const filePath of files) {
                    const rf = await readReviewFile(filePath);
                    const hasPending = rf.comments.some((c) => {
                      if (c.status !== "open") return false;
                      if (c.replies.length === 0) return true;
                      return c.replies[c.replies.length - 1]!.author !== "ai";
                    });
                    if (hasPending && rf.documentPath) pendingDocs.push(rf.documentPath);
                  }
                  return buildGlobalPrompt({ siteDir: context.siteDir, reviewsDir: resolvedReviewsDir, docsPathMap, pendingDocs, contextDirs });
                },
              });
            }

            return middlewares;
          },
        },
      };
    },
  };
}
