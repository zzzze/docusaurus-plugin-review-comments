import { useState, useEffect } from "react";

export function useDocContent(docPath: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!docPath) {
      setContent(null);
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
  }, [docPath]);

  return { content, loading };
}
