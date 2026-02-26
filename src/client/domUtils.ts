/**
 * Returns the visible text content of an element, excluding decorative
 * children such as Docusaurus hash-link anchors and aria-hidden elements.
 */
export function getVisibleText(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".hash-link, [aria-hidden='true']").forEach((el) => el.remove());
  return (clone.textContent ?? "").trim();
}
