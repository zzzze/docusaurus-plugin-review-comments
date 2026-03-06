import React from "react";
import { ReviewQueueBadge } from "./ReviewQueueBadge";

export default function Root({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      {children}
      <ReviewQueueBadge />
    </>
  );
}
