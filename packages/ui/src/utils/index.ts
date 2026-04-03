export * from "./api";
export { copyToClipboard, getVisibleText } from "./domUtils";
export {
  findNearestHeading,
  findParentBlock,
  countBlockIndex,
  buildAnchorFromSelection,
  buildAnchorFromBlock,
} from "./anchorUtils";
export {
  findTextInDocument,
  applyHighlight,
  highlightRangePerNode,
  removeHighlight,
  removeAllHighlights,
  setHighlightHover,
  scrollToHighlight,
  applyBlockHighlight,
  removeBlockHighlight,
  removeAllBlockHighlights,
} from "./highlightRenderer";
