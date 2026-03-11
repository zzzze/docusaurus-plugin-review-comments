import React, { createContext, useContext } from "react";
import { useMdReview } from "./useMdReview";

type ReviewContextValue = ReturnType<typeof useMdReview>;

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({
  docPath,
  children,
}: {
  docPath: string;
  children: React.ReactNode;
}): React.ReactElement {
  const value = useMdReview(docPath);
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
