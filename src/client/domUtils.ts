/** Copy text to clipboard, with execCommand fallback for non-secure contexts (e.g. http). */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("execCommand copy failed");
}

/**
 * Returns the visible text content of an element, excluding decorative
 * children such as Docusaurus hash-link anchors and aria-hidden elements.
 */
export function getVisibleText(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".hash-link, [aria-hidden='true']").forEach((el) => el.remove());
  return (clone.textContent ?? "").trim();
}
