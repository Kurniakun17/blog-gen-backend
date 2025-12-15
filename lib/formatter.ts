/**
 * WordPress Formatter - Main Export
 *
 * This file maintains backward compatibility by re-exporting from the refactored modules.
 * All implementation has been moved to lib/formatter/ for better organization:
 * - types.ts: Type definitions
 * - constants.ts: WordPress category/banner mappings
 * - helpers.ts: Utility functions for content transformation
 * - acf.ts: ACF block builders
 * - index.ts: Main formatting functions
 */

export {
  formatWordPressHTML,
  reconstructBlogAssets,
  type WordPressOutput,
  type FAQPair,
  type AssetReplacement,
  type BlogDraft,
} from './formatter/index';
