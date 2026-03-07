import { useLocation } from "react-router-dom";
import { DocViewer } from "../components/DocViewer";
import { DocReviewWrapper } from "../components/DocReviewWrapper";

export function DocPage() {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") || "index";

  return (
    <DocReviewWrapper docPath={docPath}>
      <DocViewer docPath={docPath + ".md"} />
    </DocReviewWrapper>
  );
}
