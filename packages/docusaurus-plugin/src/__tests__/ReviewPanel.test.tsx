import { beforeEach, expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePanelResize } from "../theme/ReviewPanel/index";

const MIN = 240;
const MAX = 800;
const DEFAULT = 320;
const STORAGE_KEY = "review-panel-width";

beforeEach(() => localStorage.clear());

test("returns default width when localStorage is empty", () => {
  const { result } = renderHook(() => usePanelResize());
  expect(result.current.width).toBe(DEFAULT);
});

test("reads persisted width from localStorage", () => {
  localStorage.setItem(STORAGE_KEY, "500");
  const { result } = renderHook(() => usePanelResize());
  expect(result.current.width).toBe(500);
});

test("clamps persisted width to valid range", () => {
  localStorage.setItem(STORAGE_KEY, "50");
  const { result } = renderHook(() => usePanelResize());
  expect(result.current.width).toBe(MIN);

  localStorage.setItem(STORAGE_KEY, "9999");
  const { result: result2 } = renderHook(() => usePanelResize());
  expect(result2.current.width).toBe(MAX);
});
