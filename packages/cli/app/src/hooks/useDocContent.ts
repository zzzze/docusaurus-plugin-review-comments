import { useState, useEffect } from "react";

export function useDocContent(docPath: string | null, docChangedKey = 0) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(docPath !== null);
  const [prevDocPath, setPrevDocPath] = useState(docPath);

  // Reset immediately when docPath changes so the first render after
  // navigation shows loading state, not stale content from the old page.
  if (docPath !== prevDocPath) {
    setPrevDocPath(docPath);
    setContent(null);
    setLoading(true);
  }

  useEffect(() => {
    if (!docPath) {
      setContent(null);
      setLoading(false);
      return;
    }
    fetch(`/api/docs/${docPath}`)
      .then((res) => res.json())
      .then((data) => {
        setContent(data.content);
        setLoading(false);
      })
      .catch(() => {
        setContent(null);
        setLoading(false);
      });
  }, [docPath, docChangedKey]);

  return { content, loading };
}
