import React, { useCallback, useEffect, useState } from "react";
import * as api from "../../client/api";
import { useCapabilities, formatInterval } from "../../client/useCapabilities";
import { HintButton } from "../HintButton";
import styles from "./styles.module.css";

type ActionState = "idle" | "working" | "done" | "error";

export function ReviewQueueBadge(): React.ReactElement | null {
  const caps = useCapabilities();
  const [pendingCount, setPendingCount] = useState(0);
  const [actionState, setActionState] = useState<ActionState>("idle");

  const fetchPending = useCallback(() => {
    fetch("/api/reviews/pending")
      .then((r) => r.json() as Promise<{ docs: string[] }>)
      .then((data) => setPendingCount(data.docs.length))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!caps || (!caps.hasTrigger && !caps.hasGlobalPrompt)) return;
    fetchPending();
  }, [caps, fetchPending]);

  useEffect(() => {
    if (!caps || (!caps.hasTrigger && !caps.hasGlobalPrompt)) return;
    let es: EventSource | null = null;
    let retryMs = 1000;

    function connect(): void {
      es = new EventSource("/api/reviews/events");
      es.addEventListener("agent:done", fetchPending);
      es.onerror = () => {
        es?.close();
        setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30_000);
      };
    }

    connect();
    return () => { es?.close(); };
  }, [caps, fetchPending]);

  if (!caps || (!caps.hasTrigger && !caps.hasGlobalPrompt)) return null;
  if (pendingCount === 0) return null;

  const handleClick = async (): Promise<void> => {
    setActionState("working");
    try {
      if (caps.hasTrigger) {
        await api.triggerReview();
      } else {
        const prompt = await api.fetchGlobalPrompt();
        await navigator.clipboard.writeText(prompt);
      }
      setActionState("done");
      setTimeout(() => setActionState("idle"), 2000);
    } catch {
      setActionState("error");
      setTimeout(() => setActionState("idle"), 2000);
    }
  };

  const count = `${pendingCount} review${pendingCount === 1 ? "" : "s"}`;
  const label =
    actionState === "done"    ? (caps.hasTrigger ? "Started!" : "Copied!") :
    actionState === "error"   ? "Failed"  :
    actionState === "working" ? "…"       :
    caps.hasTrigger           ? `Run AI (${count})` :
                                `${count} pending`;

  const intervalHint =
    caps.hasTrigger && caps.intervalMs !== undefined
      ? `Auto-review runs every ${formatInterval(caps.intervalMs)}`
      : null;

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.badge}
        onClick={() => { void handleClick(); }}
        disabled={actionState === "working"}
        title={caps.hasTrigger ? "Trigger AI review for all pending comments" : "Copy AI prompt for all pending comments"}
      >
        {label}
        {intervalHint && <HintButton text={intervalHint} align="start" />}
      </button>
    </div>
  );
}
