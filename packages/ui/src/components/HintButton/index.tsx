import React from "react";
import { HelpCircle } from "lucide-react";
import styles from "./styles.module.css";

interface HintButtonProps {
  text: string;
  direction?: "up" | "down";
  align?: "start" | "end";
}

export function HintButton({ text, direction = "up", align = "end" }: HintButtonProps): React.ReactElement {
  const dirClass = direction === "down" ? styles.popupDown : styles.popupUp;
  const alignClass = align === "start" ? styles.popupAlignStart : styles.popupAlignEnd;
  return (
    <span className={styles.hintIndicator} title={text}>
      <HelpCircle size={12} />
      <span className={`${styles.popup} ${dirClass} ${alignClass}`} role="tooltip">
        {text}
      </span>
    </span>
  );
}
