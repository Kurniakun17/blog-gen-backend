/**
 * Asset placeholder converters
 * Converts various placeholder formats to HTML
 */

/**
 * Normalize placeholder text by trimming and removing stray delimiter artifacts like "::"
 */
function cleanPlaceholderText(value: string): string {
  const trimmed = value.trim();
  const withoutDelimiter = trimmed.includes("::")
    ? trimmed.split("::")[0].trim()
    : trimmed;
  return withoutDelimiter.replace(/^:+/, "").replace(/:+$/, "");
}

/**
 * Convert __IMAGE:: placeholders to HTML img tags wrapped in <pre>
 */
export function convertImagePlaceholdersToHTML(content: string): string {
  const imagePattern =
    /\*{0,}__IMAGE::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(imagePattern, (_match, url, title, caption) => {
    url = url.trim();
    title = cleanPlaceholderText(title);
    caption = cleanPlaceholderText(caption);

    return `<pre><img class="alignnone size-medium wp-image" src="${url}" alt="${caption}" width="300" height="169" />${caption}</pre>`;
  });
}

/**
 * Convert __VIDEO:: placeholders to WordPress video shortcodes
 */
export function convertVideoPlaceholdersToShortcode(content: string): string {
  const videoPattern =
    /\*{0,}__VIDEO::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(videoPattern, (_match, url) => {
    url = url.trim();

    return `[video width="2560" height="1440" mp4="${url}"][/video]`;
  });
}

/**
 * Convert __SCREENSHOTS:: placeholders to HTML img tags wrapped in <pre>
 */
export function convertScreenshotsPlaceholdersToHTML(content: string): string {
  const imagePattern =
    /\*{0,}__SCREENSHOTS::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

  return content.replace(imagePattern, (_match, url, title, caption) => {
    url = url.trim();
    title = cleanPlaceholderText(title);
    caption = cleanPlaceholderText(caption);

    return `<pre><img class="alignnone size-medium wp-image" src="${url}" alt="${caption}" width="300" height="169" />${caption}</pre>`;
  });
}

/**
 * Wrap iframe elements with <pre> tags and clean up formatting
 */
export function wrapMediaWithPre(text: string): string {
  // Only wrap iframe elements with pre tags (images already wrapped in convertImagePlaceholdersToHTML)
  let result = text.replace(/<iframe[^>]*>.*?<\/iframe>[^\n]*(?:\n[^\n]*)*?(?=\n\n|\n$|$)/g, (match) => {
    return `<pre>${match.trim()}</pre>\n\n`;
  });

  // Clean up content inside pre tags for iframe
  // Use [\s\S] instead of the 's' flag for compatibility
  result = result.replace(/<pre>([\s\S]*?)<\/pre>/g, (_match, content) => {
    const cleanedContent = content
      .replace(/(<\/iframe>)\s*\n+\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    return `<pre>${cleanedContent}</pre>`;
  });

  result = result.replace(/::\s*<\/pre>/g, '</pre>');
  result = result.replace(/:\s*<\/pre>/g, '</pre>');

  return result;
}

/**
 * Apply all conversions to content
 */
export function convertAllPlaceholdersToHTML(content: string): string {
  let result = content;

  result = convertImagePlaceholdersToHTML(result);
  result = convertVideoPlaceholdersToShortcode(result);
  result = convertScreenshotsPlaceholdersToHTML(result);
  result = wrapMediaWithPre(result);

  return result;
}
