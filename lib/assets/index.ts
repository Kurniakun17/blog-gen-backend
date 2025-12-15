/**
 * Assets module - Public API
 * Re-exports utilities used by the separated assets workflow steps
 */

// Re-export types for external use
export type { AssetTag, AssetReplacement, NanoBananaResult } from "./types";

// Re-export utilities for external use
export { generateNanoBananaAsset } from "./nano-banana";
export { getOrCaptureScreenshot } from "./screenshots";
export { buildAssetsSearchPrompt } from "./prompts";
export { parseAssetTags, processAssetTags, generatePlaceholder } from "./processors";

// Re-export converters for placeholder to HTML conversion
export {
  convertImagePlaceholdersToHTML,
  convertVideoPlaceholdersToShortcode,
  convertScreenshotsPlaceholdersToHTML,
  wrapMediaWithPre,
  convertAllPlaceholdersToHTML,
} from "./converters";
