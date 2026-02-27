import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import * as childProcess from "node:child_process";
import { startReviewService, createReviewService } from "../service/index";
import type { DocusaurusConfig } from "@docusaurus/types";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

function makeConfig(): DocusaurusConfig {
  return {
    plugins: [
      ["@docusaurus/plugin-content-docs", { path: "docs", routeBasePath: "docs" }],
    ],
    presets: [],
  } as unknown as DocusaurusConfig;
}

describe("startReviewService", () => {
  let siteDir: string;
  let reviewsDir: string;
  let spawnMock: MockInstance;

  beforeEach(async () => {
    siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-service-site-"));
    reviewsDir = path.join(siteDir, "reviews");
    await fs.mkdir(reviewsDir, { recursive: true });

    // Mock spawn to return a fake child process
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn(),
    };
    spawnMock = vi.mocked(childProcess.spawn);
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.mocked(childProcess.spawn).mockReset();
    await fs.rm(siteDir, { recursive: true, force: true });
  });

  it("returns a stop function", () => {
    const stop = startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });
    expect(typeof stop).toBe("function");
    stop();
  });

  it("does not spawn agent when no pending reviews", async () => {
    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });

    await tick();
    stop();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns agent for each pending doc using default command (function)", async () => {
    const reviewFile = {
      documentPath: "docs/intro",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Why?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/intro.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });

    await tick();
    stop();
    expect(spawnMock).toHaveBeenCalledTimes(1);

    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[0]).toBe("-c");
    // Default command grants scoped edit permissions via --allowedTools with // absolute prefix
    expect(args[1]).toContain("--allowedTools");
    expect(args[1]).toContain(`Edit(//${reviewsDir.slice(1)}/**)`);
    expect(args[1]).toContain("Read");
    expect(args[1]).toContain("claude");
    expect(args[1]).toContain("-p");
  });

  it("uses custom agentCommand string (stdin mode)", async () => {
    const reviewFile = {
      documentPath: "docs/guide",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "bob",
          type: "issue",
          status: "open",
          content: "Bug here",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/guide.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand: "my-custom-agent --flag",
    });

    await tick();
    stop();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[1]).toContain("my-custom-agent --flag");
  });

  it("calls agentCommand function with reviewsDir and docsDirs", async () => {
    const reviewFile = {
      documentPath: "docs/fn-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Fn?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/fn-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const capturedCtx: { reviewsDir: string; docsDirs: string[] }[] = [];
    const agentCommand = (ctx: { reviewsDir: string; docsDirs: string[] }) => {
      capturedCtx.push(ctx);
      return `my-agent --dir ${ctx.reviewsDir} -p`;
    };

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand,
    });

    await tick();
    stop();
    expect(capturedCtx).toHaveLength(1);
    expect(capturedCtx[0]!.reviewsDir).toBe(reviewsDir);
    expect(Array.isArray(capturedCtx[0]!.docsDirs)).toBe(true);
    // makeConfig has docs → "docs", so docsDirs should include siteDir/docs
    expect(capturedCtx[0]!.docsDirs[0]).toContain("docs");
  });

  it("uses {prompt} placeholder mode when agentCommand string contains {prompt}", async () => {
    const reviewFile = {
      documentPath: "docs/opencode",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "bob",
          type: "question",
          status: "open",
          content: "How?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/opencode.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const fakeChildNoStdin = { on: vi.fn() };
    spawnMock.mockReturnValue(
      fakeChildNoStdin as unknown as ReturnType<typeof childProcess.spawn>,
    );

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand: "opencode run {prompt}",
    });

    await tick();
    stop();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[1]).not.toContain("{prompt}");
    expect(args[1]).toContain("opencode run");
  });

  it("respects custom intervalMs", async () => {
    const stop = startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 5000,
    });

    // Advance less than interval — no tick
    await vi.advanceTimersByTimeAsync(4999);
    stop();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("injects auto-computed allowedPaths into prompt", async () => {
    const reviewFile = {
      documentPath: "docs/security",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Safe?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/security.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    // Capture what gets written to stdin
    const writtenChunks: string[] = [];
    const fakeChild = {
      stdin: {
        write: vi.fn((chunk: string) => writtenChunks.push(chunk)),
        end: vi.fn(),
      },
      on: vi.fn(),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(), // has docs → "docs" mapping
    });

    await tick();
    stop();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const written = writtenChunks.join("");
    // reviewsDir path injected
    expect(written).toContain(reviewsDir);
    // docs fsPath injected
    expect(written).toContain("docs");
    // must not contain raw placeholder
    expect(written).not.toContain("{allowedPaths}");
  });

  it("does not spawn a second agent for a doc already in progress", async () => {
    const reviewFile = {
      documentPath: "docs/in-progress",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/in-progress.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    // Simulate a long-running agent: capture the "close" callback but never call it
    let closeCallback: (() => void) | undefined;
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "close") closeCallback = cb;
      }),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 1000,
    });

    // First tick — agent spawned, close not called yet
    await tick();
    expect(spawnMock).toHaveBeenCalledTimes(1);

    // Second tick — same doc still in progress, should not spawn again
    await tick();
    expect(spawnMock).toHaveBeenCalledTimes(1);

    // Simulate agent finishing
    closeCallback?.();

    // Third tick — doc no longer in progress, should spawn again
    await tick();
    stop();
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("calls notifier.broadcast with docPath when agent exits with code 0", async () => {
    const reviewFile = {
      documentPath: "docs/notify-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/notify-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    let closeCallback: ((code: number | null) => void) | undefined;
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((event: string, cb: (code: number | null) => void) => {
        if (event === "close") closeCallback = cb;
      }),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    const broadcast = vi.fn();
    const notifier = { connect: vi.fn(), broadcast };

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      notifier,
    });

    await tick();
    expect(broadcast).not.toHaveBeenCalled();

    closeCallback?.(0);
    expect(broadcast).toHaveBeenCalledWith("docs/notify-test");
    stop();
  });

  it("does NOT call notifier.broadcast when agent exits with non-zero code", async () => {
    const reviewFile = {
      documentPath: "docs/fail-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/fail-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    let closeCallback: ((code: number | null) => void) | undefined;
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((event: string, cb: (code: number | null) => void) => {
        if (event === "close") closeCallback = cb;
      }),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    const broadcast = vi.fn();
    const notifier = { connect: vi.fn(), broadcast };

    const { stop, tick } = createReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      notifier,
    });

    await tick();
    closeCallback?.(1);
    expect(broadcast).not.toHaveBeenCalled();
    stop();
  });

  it("stop() clears the interval", async () => {
    const reviewFile = {
      documentPath: "docs/stop-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/stop-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const stop = startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    stop();
    spawnMock.mockClear();

    await vi.advanceTimersByTimeAsync(5000);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
