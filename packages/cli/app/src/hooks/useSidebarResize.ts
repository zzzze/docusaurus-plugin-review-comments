import { useState, useCallback, useRef, useEffect } from "react";

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH = 260;
const STORAGE_KEY = "sidebar-width";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useSidebarResize() {
  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return clamp(parseInt(stored, 10), SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH);
      }
    } catch {
      // localStorage unavailable
    }
    return SIDEBAR_DEFAULT_WIDTH;
  });

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const handleRef = useCallback((handle: HTMLDivElement | null) => {
    if (!handle) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = widthRef.current;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = clamp(startWidth.current + delta, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH);
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
      } catch {
        // ignore
      }
    };

    handle.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      handle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { width, handleRef };
}
