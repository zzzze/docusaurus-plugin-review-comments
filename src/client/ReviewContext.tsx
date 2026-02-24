import React, { createContext, useContext } from "react";
import { useReviewComments } from "./useReviewComments";

type ReviewContextValue = ReturnType<typeof useReviewComments>;

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({
  docPath,
  children,
}: {
  docPath: string;
  children: React.ReactNode;
}): React.ReactElement {
  const value = useReviewComments(docPath);
  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) {
    throw new Error("useReview must be used within ReviewProvider");
  }
  return ctx;
}
