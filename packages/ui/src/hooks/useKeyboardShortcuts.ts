import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onTogglePanel: () => void;
  onDismiss: () => void;
}

export function useKeyboardShortcuts({
  onTogglePanel,
  onDismiss,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        onTogglePanel();
        return;
      }

      if (e.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePanel, onDismiss]);
}
