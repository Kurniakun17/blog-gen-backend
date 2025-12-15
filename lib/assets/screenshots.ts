/**
 * Screenshots Integration
 * Handles screenshot capture and retrieval from Supabase storage
 */

import type { ScreenshotResult } from "./types";

/**
 * Search for existing screenshot in Supabase storage
 * @param companyName - The company name to search for
 * @param title - The asset title/description
 * @returns Asset name if found, empty string otherwise
 */
async function searchExistingScreenshot(
  companyName: string,
  title: string
): Promise<{ name: string; searchQuery: string } | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Screenshots] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return null;
  }

  // Generate search attempts with escalating specificity
  const attempts = generateSearchAttempts(companyName, title);

  for (const attempt of attempts) {
    try {
      console.log(`[Screenshots] Searching with query: "${attempt}"`);

      const searchResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/list/public_assets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            prefix: "blog-gen/screenshots/",
            search: attempt,
            limit: 10,
            offset: 0,
          }),
        }
      );

      if (!searchResponse.ok) {
        console.warn(
          `[Screenshots] Search failed for "${attempt}":`,
          searchResponse.statusText
        );
        continue;
      }

      const results = await searchResponse.json();

      // Find the most relevant screenshot
      if (Array.isArray(results) && results.length > 0) {
        // Filter for actual screenshots (not icons, banners, thumbnails)
        const screenshots = results.filter(
          (item: any) =>
            item.name &&
            !item.name.includes("icon") &&
            !item.name.includes("banner") &&
            !item.name.includes("thumb")
        );

        if (screenshots.length > 0) {
          console.log(
            `[Screenshots] Found existing screenshot: ${screenshots[0].name}`
          );
          return {
            name: screenshots[0].name,
            searchQuery: attempt,
          };
        }
      }
    } catch (error) {
      console.error(`[Screenshots] Error searching with "${attempt}":`, error);
      continue;
    }
  }

  console.log("[Screenshots] No existing screenshot found after all attempts");
  return null;
}

/**
 * Generate escalating search attempts
 * @param companyName - Company name
 * @param title - Asset title
 * @returns Array of search queries to try
 */
function generateSearchAttempts(
  companyName: string,
  title: string
): string[] {
  // Clean company name: lowercase, no spaces
  const cleanCompany = companyName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  // Shrinked version (remove common suffixes)
  const shrinkedCompany = cleanCompany
    .replace(/ai$/i, "")
    .replace(/inc$/i, "")
    .replace(/ltd$/i, "");

  return [
    // Attempt 1: Company name only
    cleanCompany,

    // Attempt 2: Company + blog
    `${cleanCompany}-blog`,

    // Attempt 3: Company + blog-writer
    `${cleanCompany}-blog-writer`,

    // Attempt 4: Shrinked company name
    shrinkedCompany,

    // Attempt 5: Just the base company name for fallback
    companyName.toLowerCase().replace(/\s+/g, ""),
  ];
}

/**
 * Capture a screenshot using ScreenshotOne API
 * @param url - The URL to capture
 * @param title - Title for the screenshot file
 * @returns Screenshot result with public URL
 */
async function captureScreenshot(
  url: string,
  title: string
): Promise<ScreenshotResult | null> {
  try {
    const screenshotOneKey = process.env.SCREENSHOTONE_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!screenshotOneKey || !supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "[Screenshots] Missing SCREENSHOTONE_API_KEY, SUPABASE_URL, or SUPABASE_ANON_KEY"
      );
      return null;
    }

    // Step 1: Capture screenshot using ScreenshotOne
    console.log(`[Screenshots] Capturing screenshot of: ${url}`);
    const screenshotUrl = new URL("https://api.screenshotone.com/take");
    screenshotUrl.searchParams.set("access_key", screenshotOneKey);
    screenshotUrl.searchParams.set("url", url);
    screenshotUrl.searchParams.set("block_cookie_banners", "true");
    screenshotUrl.searchParams.set("format", "png");
    screenshotUrl.searchParams.set("viewport_width", "1920");
    screenshotUrl.searchParams.set("viewport_height", "1080");

    console.log(`[Screenshots] API URL: ${screenshotUrl.toString()}`);

    const captureResponse = await fetch(screenshotUrl.toString(), {
      method: "GET",
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error(
        "[Screenshots] Capture failed:",
        captureResponse.status,
        captureResponse.statusText
      );
      console.error("[Screenshots] Error details:", errorText);
      return null;
    }

    const screenshotBuffer = await captureResponse.arrayBuffer();

    // Step 2: Generate filename from title
    const filename = title
      .toLowerCase()
      .replace(/screenshots?-/gi, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

    // Step 3: Upload to Supabase Storage
    console.log(`[Screenshots] Uploading screenshot: ${filename}`);
    const uploadUrl = `${supabaseUrl}/storage/v1/object/public_assets/blog-gen/screenshots/${filename}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: Buffer.from(screenshotBuffer),
    });

    if (!uploadResponse.ok) {
      console.error(
        "[Screenshots] Upload failed:",
        await uploadResponse.text()
      );
      return null;
    }

    // Step 4: Generate public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/public_assets/blog-gen/screenshots/${filename}`;

    console.log("[Screenshots] Screenshot captured successfully:", publicUrl);

    return {
      url: publicUrl,
      title: title,
    };
  } catch (error) {
    console.error("[Screenshots] Capture failed:", error);
    return null;
  }
}

/**
 * Get or create a screenshot for a company landing page
 * Tries to find existing screenshot first, captures new one if not found
 * @param url - Company landing page URL
 * @param title - Screenshot title/description
 * @param companyName - Company name for search
 * @returns Screenshot result with public URL, or null if failed
 */
export async function getOrCaptureScreenshot(
  url: string,
  title: string,
  companyName: string
): Promise<ScreenshotResult | null> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
      console.warn("[Screenshots] Missing SUPABASE_URL");
      return null;
    }

    // Step 1: Try to find existing screenshot
    console.log(
      `[Screenshots] Searching for existing screenshot of: ${companyName}`
    );
    const existing = await searchExistingScreenshot(companyName, title);

    if (existing && existing.name) {
      // Found existing screenshot
      const existingUrl = `${supabaseUrl}/storage/v1/object/public/public_assets/blog-gen/screenshots/${existing.name}`;
      console.log("[Screenshots] Using existing screenshot:", existingUrl);

      return {
        url: existingUrl,
        title: title,
      };
    }

    // Step 2: No existing screenshot found, capture new one
    console.log("[Screenshots] No existing screenshot found, capturing new one");
    return await captureScreenshot(url, title);
  } catch (error) {
    console.error("[Screenshots] Operation failed:", error);
    return null;
  }
}
