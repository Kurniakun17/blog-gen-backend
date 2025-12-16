/**
 * WordPress Formatter Module
 *
 * This module handles WordPress-specific formatting and output preparation.
 * It provides the main formatWordPressHTML function and asset reconstruction utilities.
 */

import type { BlogDraft } from "../writer";
import { cleanLLMJson } from "../utils";
import {
  adjustHeaderLevels,
  getCategoryId,
  getBannerId,
} from "./helpers";
import { buildTextBlock, buildFAQBlock } from "./acf";
import type { WordPressOutput, AssetReplacement } from "./types";

// Re-export types for consumers
export type { WordPressOutput, FAQPair, AssetReplacement } from "./types";
export type { BlogDraft };

/**
 * Format a blog draft into WordPress-ready HTML with ACF blocks
 * @param draft - The blog draft to format
 * @returns WordPress-formatted output with all required fields
 */
export async function formatWordPressHTML({
  draft,
  slug,
}: {
  draft: BlogDraft;
  slug: string;
}): Promise<WordPressOutput> {
  let textContent = draft.content;

  // Step 1: Remove meta title and description
  let transformedText = textContent
    .replace(
      /^(?:\*\*)?Meta\s+(?:Title|Description)(?:\*\*)?:[\s\S]*?^---\s*$/im,
      ""
    )
    .replace(/<\/?blog>/g, "")
    .replace(/^(#+\s+.+)$/gm, "\n$1\n")
    .replace(/^([\-\*\+]\s+)/gm, "\n$1")
    .replace(/^(\d+\.\s+)/gm, "\n$1")
    .replace(/^(```)/gm, "\n$1")
    .replace(/(```\s*)$/gm, "$1\n")
    .replace(/<assets>/g, "\n<assets>")
    .replace(/<\/assets>/g, "</assets>\n")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/([.!?])\s*\n([A-Z])/g, "$1\n\n$2")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[—–]/g, ", ")
    .replace(/^\s*\n+/, "")
    .replace(/(\|[^\n]+\|\n)(\*[^\n]|[^|\n*])/g, "$1\n$2");

  // Step 2: Extract title from H1 and remove it from content
  let extractedTitle =
    draft.metaTitle && draft.metaTitle.trim() !== "" ? draft.metaTitle : "";
  const h1Match = transformedText.match(/^#\s+(.+?)$/m);

  if (h1Match) {
    extractedTitle = h1Match[1].trim();
    transformedText = transformedText.replace(/^#\s+.+?$/m, "").trim();
  }

  const safeTitle =
    extractedTitle && extractedTitle.trim() !== ""
      ? extractedTitle
      : "Untitled Blog Post - " + Date.now();

  console.log(`Formatting blog draft: ${safeTitle}`);

  // Step 3: Adjust header levels
  transformedText = adjustHeaderLevels(transformedText);

  // Step 4: Extract tags if present (Tags: tag1, tag2, tag3)
  const tagsMatch = transformedText.match(/^Tags?:\s*(.+)$/im);
  let tags: string[] = [];
  if (tagsMatch) {
    // Extract tags and remove the Tags line from content
    const tagsLine = tagsMatch[0];
    const tagsString = tagsMatch[1].trim();
    tags = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    transformedText = transformedText.replace(tagsLine, "").trim();
  }

  let mainContent = transformedText;

  const faqs = draft.faqs || [];

  const textblockJson = buildTextBlock(mainContent);
  const faqsJson = buildFAQBlock(faqs);

  // Step 5: Get category and banner IDs
  const categoryId = getCategoryId(safeTitle, draft.blogType);
  const bannerId = getBannerId(categoryId);

  // Step 6: Construct final WordPress content
  let wpContent = `<!-- wp:acf/textblock ${JSON.stringify(
    textblockJson
  )} /--> <!-- wp:acf/faqs ${JSON.stringify(faqsJson)} /-->`;

  wpContent = wpContent.replace(/\|\\n\\n/g, "|\\n\\n&nbsp;\\n\\n");
  console.log("wpContent", wpContent);
  // Step 7: Generate live blog URL
  const liveBlogURL = `https://www.eesel.ai/blog/${slug.replace(/-en$/, "")}`;

  return {
    title: safeTitle,
    content: wpContent,
    slug,
    categoryId,
    bannerId,
    faqs,
    text: mainContent,
    tags: tags.length > 0 ? tags : draft.tags || [],
    liveBlogURL,
  };
}

/**
 * Reconstruct blog content by applying asset replacements
 *
 * This function performs safe string replacement by using split/join instead of regex,
 * which avoids issues with special characters in the replacement strings.
 * It can handle both parsed arrays and JSON strings (including markdown-wrapped JSON).
 *
 * @param originalText - The original blog content before replacements
 * @param replacements - Array of replacement objects OR JSON string with markdown wrapper
 * @returns The reconstructed blog content with all replacements applied
 *
 * @example
 * ```typescript
 * const original = "Check out __PLACEHOLDER1__ and __PLACEHOLDER2__";
 *
 * // Using array
 * const replacements = [
 *   { original_block: "__PLACEHOLDER1__", replacement: "<img src='image1.jpg' />" },
 *   { original_block: "__PLACEHOLDER2__", replacement: "<img src='image2.jpg' />" }
 * ];
 *
 * // Or using JSON string (with optional markdown wrapper)
 * const replacementsJSON = '```json\n[{"original_block":"__PLACEHOLDER1__","replacement":"<img />"}]\n```';
 *
 * const result = reconstructBlogAssets(original, replacements);
 * ```
 */
export function reconstructBlogAssets(
  originalText: string,
  replacements: AssetReplacement[] | string | unknown
): string {
  // Start with the original text
  let finalBlog = originalText;

  // Parse replacements if it's a string or unknown type
  let parsedReplacements: AssetReplacement[] = [];

  try {
    // Handle string input (potentially with markdown ```json ... ``` wrapper)
    if (typeof replacements === "string") {
      const cleanedString = cleanLLMJson(replacements);
      parsedReplacements = JSON.parse(cleanedString) as AssetReplacement[];
    } else if (Array.isArray(replacements)) {
      parsedReplacements = replacements as AssetReplacement[];
    } else {
      console.log("No replacements found or invalid format");
      return finalBlog;
    }
  } catch (e) {
    console.log("No replacements found or invalid JSON from Agent:", e);
    return finalBlog;
  }

  // Validate that parsedReplacements is an array with items
  if (!Array.isArray(parsedReplacements) || parsedReplacements.length === 0) {
    console.log("No valid replacements to apply");
    return finalBlog;
  }

  // Apply each replacement sequentially
  for (const item of parsedReplacements) {
    if (item.original_block && item.replacement) {
      finalBlog = finalBlog
        .split(String(item.original_block))
        .join(String(item.replacement));
    } else {
      console.warn(
        "Skipping invalid replacement item (missing original_block or replacement):",
        item
      );
    }
  }

  return finalBlog;
}
