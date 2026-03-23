import { useState, useEffect } from "react";

export function useDocContent(docPath: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevDocPath, setPrevDocPath] = useState(docPath);
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset immediately when docPath changes so the first render after
  // navigation shows loading state, not stale content from the old page.
  if (docPath !== prevDocPath) {
    setPrevDocPath(docPath);
    setContent(null);
    setLoading(true);
  }

  // Listen for doc:changed SSE events and re-fetch when the current doc changes
  useEffect(() => {
    const es = new EventSource("/api/reviews/events");
    es.addEventListener("doc:changed", (e) => {
      try {
        const { docPath: changedPath } = JSON.parse(e.data);
        if (docPath && changedPath === docPath) {
          setRefreshKey((k) => k + 1);
        }
      } catch {
        // ignore malformed events
      }
    });
    return () => es.close();
  }, [docPath]);

  useEffect(() => {
    if (!docPath) {
      setContent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
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
  }, [docPath, refreshKey]);

  return { content, loading };
}
