import { useState, useEffect } from "react";

export interface DocTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: DocTreeEntry[];
}

export function useDocs() {
  const [tree, setTree] = useState<DocTreeEntry[]>([]);
  const [singleFile, setSingleFile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        setTree(data.tree);
        setSingleFile(!!data.singleFile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { tree, singleFile, loading };
}
