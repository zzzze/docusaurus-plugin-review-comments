import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "../client/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  const onTogglePanel = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onTogglePanel on Ctrl+Shift+M", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onTogglePanel, onDismiss }),
    );

    const event = new KeyboardEvent("keydown", {
      key: "M",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(onTogglePanel).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismiss on Escape", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onTogglePanel, onDismiss }),
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onTogglePanel).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onTogglePanel, onDismiss }),
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
    });

    expect(onTogglePanel).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not trigger on Ctrl+M without Shift", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onTogglePanel, onDismiss }),
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "M",
          ctrlKey: true,
          shiftKey: false,
          bubbles: true,
        }),
      );
    });

    expect(onTogglePanel).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onTogglePanel, onDismiss }),
    );

    unmount();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "M",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    expect(onTogglePanel).not.toHaveBeenCalled();
  });
});
