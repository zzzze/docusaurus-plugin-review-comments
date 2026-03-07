import { useLocation } from "react-router-dom";
import { DocViewer } from "../components/DocViewer";

export function DocPage() {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") + ".md";

  return <DocViewer docPath={docPath} />;
}
