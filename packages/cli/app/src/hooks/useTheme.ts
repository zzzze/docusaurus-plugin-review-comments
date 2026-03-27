import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme-mode";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);

  const hljsStyleId = "hljs-theme";
  let link = document.getElementById(hljsStyleId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = hljsStyleId;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href =
    resolved === "dark"
      ? new URL("highlight.js/styles/github-dark.css", import.meta.url).href
      : new URL("highlight.js/styles/github.css", import.meta.url).href;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  });

  const resolved = mode === "system" ? getSystemTheme() : mode;

  // Apply theme on mount and when mode changes
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { mode, resolved, setMode };
}
