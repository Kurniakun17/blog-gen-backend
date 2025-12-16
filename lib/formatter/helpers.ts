/**
 * Helper functions for WordPress formatter
 */

import {
  CATEGORY_MAP,
  CATEGORY_BANNER_MAP,
  GUIDE_BANNER_IDS,
} from "./constants";
import type { FAQPair } from "./types";

/**
 * Convert __IMAGE::URL::TITLE::CAPTION__ placeholders to HTML with pre tags
 */
export function convertImagePlaceholdersToHTML(content: string): string {
  const imagePattern =
    /\*{0,}__IMAGE::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(
    imagePattern,
    (_match, rawUrl: string, _title: string, rawCaption: string) => {
      void _title;
      const url = rawUrl.trim();
      const caption = rawCaption.trim();

      return `<pre><img class="alignnone size-medium wp-image" src="${url}" alt="${caption}" width="300" height="169" />${caption}</pre>`;
    }
  );
}

/**
 * Convert __VIDEO::URL::TITLE::CAPTION__ placeholders to WordPress shortcode
 */
export function convertVideoPlaceholdersToShortcode(content: string): string {
  const videoPattern =
    /\*{0,}__VIDEO::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(
    videoPattern,
    (_match, rawUrl: string, _title: string, _caption: string) => {
      void _title;
      void _caption;
      const url = rawUrl.trim();
      return `[video width="2560" height="1440" mp4="${url}"][/video]`;
    }
  );
}

/**
 * Convert __SCREENSHOTS::URL::TITLE::CAPTION__ placeholders to HTML
 */
export function convertScreenshotsPlaceholdersToHTML(content: string): string {
  const imagePattern =
    /\*{0,}__SCREENSHOTS::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(
    imagePattern,
    (_match, rawUrl: string, _title: string, rawCaption: string) => {
      void _title;
      const url = rawUrl.trim();
      const caption = rawCaption.trim();

      return `<pre><img class="alignnone size-medium wp-image" src="${url}" alt="${caption}" width="300" height="169" />${caption}</pre>`;
    }
  );
}

/**
 * Wrap media elements (iframes) with pre tags
 */
export function wrapMediaWithPre(text: string): string {
  // Only wrap iframe elements with pre tags (images already wrapped)
  let result = text.replace(
    /<iframe[^>]*>.*?<\/iframe>[^\n]*(?:\n[^\n]*)*?(?=\n\n|\n$|$)/g,
    (match) => {
      return `<pre>${match.trim()}</pre>\n\n`;
    }
  );

  // Clean up content inside pre tags for iframe
  result = result.replace(/<pre>([\s\S]*?)<\/pre>/g, (match, content) => {
    const cleanedContent = content
      .replace(/(<\/iframe>)\s*\n+\s*/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    return `<pre>${cleanedContent}</pre>`;
  });

  result = result.replace(/::\s*<\/pre>/g, "</pre>");
  result = result.replace(/:\s*<\/pre>/g, "</pre>");

  return result;
}

/**
 * Adjust header levels if the first header is H3 or deeper
 */
export function adjustHeaderLevels(text: string): string {
  const lines = text.split("\n");
  let firstHeader: string | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (/^#+\s+/.test(trimmedLine)) {
      firstHeader = trimmedLine;
      break;
    }
  }

  if (firstHeader && /^#{3,}\s+/.test(firstHeader)) {
    return text.replace(
      /^(\s*)(#+)(\s+.+)$/gm,
      (match, whitespace, hashes, content) => {
        const newHashes = hashes.length > 1 ? hashes.slice(1) : "#";
        return whitespace + newHashes + content;
      }
    );
  }

  return text;
}

/**
 * Get WordPress Category ID based on title keywords
 */
export function getCategoryId(title: string, blogType: string): number {
  const keywords = (title || "").toLowerCase();

  if (blogType === "overview") {
    // For overview: prioritize software keywords first
    for (const [keyword, categoryId] of Object.entries(CATEGORY_MAP)) {
      if (
        keyword !== "alternatives" &&
        keyword !== "guide" &&
        keywords.includes(keyword)
      ) {
        return categoryId;
      }
    }
    if (keywords.includes("alternatives") || keywords.includes("alternative")) {
      return CATEGORY_MAP["alternatives"];
    }
  } else {
    // For other types: prioritize alternatives first
    if (keywords.includes("alternatives") || keywords.includes("alternative")) {
      return CATEGORY_MAP["alternatives"];
    }
    for (const [keyword, categoryId] of Object.entries(CATEGORY_MAP)) {
      if (
        keyword !== "alternatives" &&
        keyword !== "guide" &&
        keywords.includes(keyword)
      ) {
        return categoryId;
      }
    }
  }

  return CATEGORY_MAP["guide"];
}

/**
 * Get a random Banner ID based on the Category ID
 */
export function getBannerId(categoryId: number): number {
  if (CATEGORY_BANNER_MAP[categoryId]) {
    const bannerIds = CATEGORY_BANNER_MAP[categoryId];
    return bannerIds[Math.floor(Math.random() * bannerIds.length)];
  }

  // Default to guide banners for unlisted categories
  return GUIDE_BANNER_IDS[Math.floor(Math.random() * GUIDE_BANNER_IDS.length)];
}

/**
 * Parse FAQ section from content
 * Handles multiple formats:
 * 1. Q#:/A#: format
 * 2. ### Question format (H3 headers)
 * 3. ## header format (H2 headers)
 */
export function parseFAQs(faqContent: string): FAQPair[] {
  const faqPairs: FAQPair[] = [];

  if (!faqContent) {
    return faqPairs;
  }

  // Remove the FAQ section header itself (first line)
  // This matches both "## FAQ:" and "## Frequently Asked Questions" patterns
  let contentWithoutHeader = faqContent;

  // Try to remove FAQ header - match both "FAQ" and "Frequently Asked Questions" patterns
  const faqHeaderMatch = contentWithoutHeader.match(
    /^#+\s*(FAQ[:\s]?.*|.*frequently asked questions?.*)$/im
  );
  if (faqHeaderMatch) {
    // Remove the entire first line (the section header)
    contentWithoutHeader = contentWithoutHeader
      .replace(faqHeaderMatch[0], "")
      .trim();
  }

  // Try matching Q#:/A#: format first
  const qRegex = /^Q(\d+):\s*(.+)$/gm;
  const aRegex = /^A(\d+):\s*([\s\S]+?)(?=^Q\d+:|^A\d+:|$)/gm;

  const qMatches: RegExpExecArray[] = [];
  const aMatches: RegExpExecArray[] = [];

  let qMatch: RegExpExecArray | null;
  while ((qMatch = qRegex.exec(contentWithoutHeader)) !== null) {
    qMatches.push(qMatch);
  }

  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(contentWithoutHeader)) !== null) {
    aMatches.push(aMatch);
  }

  if (qMatches.length > 0) {
    // Use Q#:/A#: format
    for (let i = 0; i < qMatches.length; i++) {
      const question = qMatches[i][2].trim();
      const aMatchFound = aMatches.find((a) => a[1] === qMatches[i][1]);
      const answer = aMatchFound ? aMatchFound[2].trim() : "";
      faqPairs.push({ question, answer });
    }
  } else {
    // Fall back to header format (H2 or H3)
    // Split by H3 headers (###) which is the primary format the LLM uses
    const faqQuestionRegex = /^###\s*(.+?)\s*$/gm;
    const sections = contentWithoutHeader
      .split(faqQuestionRegex)
      .filter((s) => s.trim());

    if (sections.length > 1) {
      // H3 format found (### Question)
      for (let i = 0; i < sections.length; i += 2) {
        if (i + 1 < sections.length) {
          const question = sections[i].trim();
          const answer = sections[i + 1].replace(/^A\d+:\s*/, "").trim();
          faqPairs.push({ question, answer });
        }
      }
    } else {
      // Try H2 format (## Question) as final fallback
      const h2QuestionRegex = /^##\s*(.+?)\s*$/gm;
      const h2Sections = contentWithoutHeader
        .split(h2QuestionRegex)
        .filter((s) => s.trim());

      for (let i = 0; i < h2Sections.length; i += 2) {
        if (i + 1 < h2Sections.length) {
          const question = h2Sections[i].trim();
          const answer = h2Sections[i + 1].replace(/^A\d+:\s*/, "").trim();
          faqPairs.push({ question, answer });
        }
      }
    }
  }

  return faqPairs;
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string | null | undefined): string {
  // Guard clause: return fallback slug if title is falsy
  if (!title || title.trim() === "") {
    return "default-blog-slug-" + Date.now();
  }

  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}
