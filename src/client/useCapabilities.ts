import { useEffect, useState } from "react";
import { fetchCapabilities } from "./api";
import type { Capabilities } from "./api";

let cached: Capabilities | null = null;

export function useCapabilities(): Capabilities | null {
  const [caps, setCaps] = useState<Capabilities | null>(cached);

  useEffect(() => {
    if (cached) return;
    fetchCapabilities()
      .then((c) => { cached = c; setCaps(c); })
      .catch(() => null);
  }, []);

  return caps;
}

export function formatInterval(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.round(totalMinutes / 60)}h`;
}
