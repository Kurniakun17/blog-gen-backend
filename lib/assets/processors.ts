/**
 * Asset processing utilities
 * Handles parsing and converting asset tags to placeholders
 */

import type { AssetTag, AssetReplacement } from "./types";

/**
 * Parse <assets> tags from content using regex
 * Updated to support new format with Asset 1:, Alt title:, Alt text:
 */
export function parseAssetTags(content: string): AssetTag[] {
  // Match the new format with Asset 1:, Alt title:, Alt text:
  const assetBlockPattern = /<assets>([\s\S]*?)<\/assets>/gi;
  const matches = content.matchAll(assetBlockPattern);
  const tags: AssetTag[] = [];

  for (const match of matches) {
    const blockContent = match[1];

    // Extract type from "Asset 1: [type] –" pattern
    const typeMatch = blockContent.match(/Asset\s+\d+:\s*([\w_]+)\s*[–-]/i);
    if (!typeMatch) continue;

    const type = typeMatch[1].toLowerCase();

    // Validate type
    if (
      !["screenshot", "internal", "eesel_internal_asset", "workflow", "workflowV2",  "infographic"].includes(type)
    ) {
      console.warn(`Unknown asset type: ${type}, skipping...`);
      continue;
    }

    // Extract description (everything after the type and before Alt title)
    const descMatch = blockContent.match(
      /Asset\s+\d+:\s*[\w_]+\s*[–-]\s*(.+?)(?=Alt title:|$)/i
    );
    const description = descMatch ? descMatch[1].trim() : "";

    tags.push({
      fullTag: match[0],
      type: type as AssetTag["type"],
      description,
    });
  }

  return tags;
}

/**
 * Generate placeholder URL based on asset type and description
 */
export function generatePlaceholder(
  type: AssetTag["type"],
  description: string
): string {
  // Extract a short title from description (first 3-5 words)
  const words = description.split(" ").slice(0, 4).join(" ");
  const title = words.length > 50 ? words + "..." : words;

  // Generate caption from full description
  const caption =
    description.length > 100
      ? description + "..."
      : description;

  if (type === "screenshot") {
    return `__SCREENSHOTS::https://placehold.co/600x400?text=Screenshot+Placeholder::${title}::${caption}__`;
  } else if (type === "workflow") {
    return `__WORKFLOW::https://placehold.co/600x400?text=Workflow+Diagram::${title}::${caption}__`;
  } else if (type === "eesel_internal_asset") {
    return `__EESEL_INTERNAL::https://placehold.co/600x400?text=Eesel+Asset::${title}::${caption}__`;
  } else if (type === "infographic") {
    return `__INFOGRAPHIC::https://placehold.co/600x400?text=Infographic::${title}::${caption}__`;
  } else {
    // Default to internal/image
    return `__IMAGE::https://placehold.co/600x400?text=Internal+Asset::${title}::${caption}__`;
  }
}

/**
 * Process asset tags and convert them to placeholder strings
 */
export function processAssetTags(content: string): AssetReplacement[] {
  const assetTags = parseAssetTags(content);
  const replacements: AssetReplacement[] = [];

  for (const tag of assetTags) {
    const placeholder = generatePlaceholder(tag.type, tag.description);

    replacements.push({
      original_block: tag.fullTag,
      replacement: placeholder,
    });
  }

  console.log(`Processed ${replacements.length} asset tags`);
  return replacements;
}
