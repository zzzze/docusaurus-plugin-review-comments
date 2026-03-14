import "simplebar-react/dist/simplebar.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDocs } from "./hooks/useDocs";
import { Layout } from "./components/Layout";
import { DocPage } from "./pages/DocPage";
import type { DocTreeEntry } from "./hooks/useDocs";

function findFirstDoc(tree: DocTreeEntry[]): string | null {
  for (const entry of tree) {
    if (entry.type === "file") {
      return "/" + entry.path.replace(/\.(md|mdx)$/i, "");
    }
    if (entry.children) {
      const found = findFirstDoc(entry.children);
      if (found) return found;
    }
  }
  return null;
}

function AppContent() {
  const { tree, singleFile, loading } = useDocs();

  if (loading) return <div className="loading-screen">Loading documents...</div>;

  const firstDoc = findFirstDoc(tree);

  return (
    <Layout tree={tree} hideSidebar={singleFile}>
      <Routes>
        {firstDoc && <Route path="/" element={<Navigate to={firstDoc} replace />} />}
        <Route path="/*" element={<DocPage />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
