import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

type SnapPoint = "collapsed" | "half" | "full";

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  collapsed: "48px",
  half: "50dvh",
  full: "90dvh",
};

interface BottomSheetProps {
  isOpen: boolean;
  commentCount: number;
  onToggle: () => void;
  children: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  commentCount,
  onToggle,
  children,
}: BottomSheetProps): React.ReactElement {
  const [snap, setSnap] = useState<SnapPoint>(isOpen ? "half" : "collapsed");
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Sync snap state when isOpen changes externally (e.g. highlight click)
  useEffect(() => {
    if (isOpen && snap === "collapsed") {
      setSnap("half");
    } else if (!isOpen && snap !== "collapsed") {
      setSnap("collapsed");
    }
  }, [isOpen]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartY.current = e.clientY;
      const sheet = sheetRef.current;
      dragStartHeight.current = sheet?.offsetHeight ?? 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartY.current) return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.max(48, dragStartHeight.current + delta);
      sheet.style.height = `${newHeight}px`;
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragStartY.current = 0;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const currentHeight = sheet.offsetHeight;
    const ratio = currentHeight / viewportHeight;

    let nextSnap: SnapPoint;
    if (ratio < 0.2) {
      nextSnap = "collapsed";
    } else if (ratio < 0.7) {
      nextSnap = "half";
    } else {
      nextSnap = "full";
    }

    setSnap(nextSnap);
    sheet.style.height = SNAP_HEIGHTS[nextSnap];

    if (nextSnap === "collapsed" && isOpen) {
      onToggle();
    } else if (nextSnap !== "collapsed" && !isOpen) {
      onToggle();
    }
  }, [isOpen, onToggle]);

  const handleHeaderClick = useCallback(() => {
    const sheet = sheetRef.current;
    if (snap === "collapsed") {
      setSnap("half");
      if (sheet) sheet.style.height = SNAP_HEIGHTS.half;
      if (!isOpen) onToggle();
    } else {
      setSnap("collapsed");
      if (sheet) sheet.style.height = SNAP_HEIGHTS.collapsed;
      if (isOpen) onToggle();
    }
  }, [snap, isOpen, onToggle]);

  const height = SNAP_HEIGHTS[snap];

  return (
    <div
      ref={sheetRef}
      className={styles.bottomSheet}
      style={{ height }}
    >
      <div
        className={styles.dragHandle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-label="Resize comment panel"
        aria-valuenow={snap === "collapsed" ? 0 : snap === "half" ? 50 : 100}
        tabIndex={0}
      >
        <div className={styles.dragBar} />
      </div>

      <div
        className={styles.sheetHeader}
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleHeaderClick();
        }}
      >
        <span className={styles.sheetTitle}>
          Comments ({commentCount})
        </span>
      </div>

      {snap !== "collapsed" && (
        <div className={styles.sheetBody}>{children}</div>
      )}
    </div>
  );
}
