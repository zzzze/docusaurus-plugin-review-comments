declare module "*.module.css" {
  const styles: { readonly [key: string]: string };
  export default styles;
}

declare module "@theme-init/DocItem/Layout" {
  import React from "react";
  const OriginalLayout: React.ComponentType<Record<string, unknown>>;
  export default OriginalLayout;
}

declare module "@docusaurus/router" {
  export function useLocation(): {
    pathname: string;
    search: string;
    hash: string;
    state: unknown;
    key: string;
  };
}
