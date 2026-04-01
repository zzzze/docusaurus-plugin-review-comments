import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// Mock CSS modules
vi.mock("../theme/ReviewPanel/styles.module.css", () => ({
  default: new Proxy(
    {},
    { get: (_, prop) => (typeof prop === "string" ? prop : "") },
  ),
}));

vi.mock("../theme/CommentForm/styles.module.css", () => ({
  default: new Proxy(
    {},
    { get: (_, prop) => (typeof prop === "string" ? prop : "") },
  ),
}));
