/**
 * Link Extractor - extracts URLs from research context and company profile
 */

import type { CompanyProfile } from "./company";

/**
 * Extract external URLs from research context XML
 *
 * @param researchContext - XML-formatted research context with <source> tags
 * @returns Array of external URLs
 */
export function extractExternalUrlsFromResearch(
  researchContext: string
): string[] {
  if (!researchContext) return [];

  const urls: string[] = [];
  const sourceRegex = /<source>(.*?)<\/source>/g;
  let match;

  while ((match = sourceRegex.exec(researchContext)) !== null) {
    const url = match[1].trim();
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Extract internal links from company profile relevant URLs
 *
 * @param companyProfile - Company profile object with relevant_urls
 * @returns Array of formatted internal links (title - url)
 */
export function extractInternalLinksFromCompany(
  companyProfile: CompanyProfile
): string[] {
  if (!companyProfile.relevant_urls || companyProfile.relevant_urls.length === 0) {
    return [];
  }

  return companyProfile.relevant_urls.map((urlObj) => {
    return `${urlObj.title} - ${urlObj.link}`;
  });
}

/**
 * Extract both internal and external links from workflow data
 *
 * @param researchContext - Research context XML
 * @param companyProfile - Company profile object
 * @returns Object with internalLinks and externalUrls arrays
 */
export function extractAllLinks(
  researchContext: string,
  companyProfile: CompanyProfile
): {
  internalLinks: string[];
  externalUrls: string[];
} {
  return {
    internalLinks: extractInternalLinksFromCompany(companyProfile),
    externalUrls: extractExternalUrlsFromResearch(researchContext),
  };
}
