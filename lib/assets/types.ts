/**
 * Type definitions for the assets module
 */

/**
 * Asset tag structure parsed from AI-generated content
 */
export interface AssetTag {
  fullTag: string;
  type: "screenshot" | "internal" | "eesel_internal_asset" | "workflow" | "workflowV2" | "infographic";
  description: string;
}

/**
 * Asset replacement structure for reconstructBlogAssets
 */
export interface AssetReplacement {
  original_block: string;
  replacement: string;
}

/**
 * Result from nano-banana asset generation
 */
export interface NanoBananaResult {
  url: string;
  title: string;
}

/**
 * Result from screenshot operations
 */
export interface ScreenshotResult {
  url: string;
  title: string;
}
