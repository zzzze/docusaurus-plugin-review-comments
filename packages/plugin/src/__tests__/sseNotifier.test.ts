import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { createSseNotifier } from "../api/sseNotifier";

function makeMockRes(): Response {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event]!.push(cb);
    }),
    _listeners: listeners,
  } as unknown as Response;
}

describe("createSseNotifier", () => {
  it("connect() sets correct SSE headers", () => {
    const notifier = createSseNotifier();
    const res = makeMockRes();
    notifier.connect(res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
    expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it("broadcast() writes agent:done event to all connected clients", () => {
    const notifier = createSseNotifier();
    const res1 = makeMockRes();
    const res2 = makeMockRes();
    notifier.connect(res1);
    notifier.connect(res2);

    notifier.broadcast("docs/intro");

    const expected = `event: agent:done\ndata: ${JSON.stringify({ docPath: "docs/intro" })}\n\n`;
    expect(res1.write).toHaveBeenCalledWith(expected);
    expect(res2.write).toHaveBeenCalledWith(expected);
  });

  it("disconnected clients are removed from the set on close", () => {
    const notifier = createSseNotifier();
    const res = makeMockRes() as unknown as Response & { _listeners: Record<string, (() => void)[]> };
    notifier.connect(res);

    // Trigger the 'close' event to simulate disconnection
    const closeCbs = res._listeners["close"] ?? [];
    for (const cb of closeCbs) cb();

    notifier.broadcast("docs/intro");
    expect(res.write).not.toHaveBeenCalled();
  });

  it("broadcast() does nothing when no clients are connected", () => {
    const notifier = createSseNotifier();
    // Should not throw
    expect(() => notifier.broadcast("docs/intro")).not.toThrow();
  });
});
