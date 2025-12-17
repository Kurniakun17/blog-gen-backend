/**
 * YouTube search module - searches for relevant YouTube videos using SerpApi
 */

/**
 * YouTube video result from SerpApi
 */
export interface YouTubeVideo {
  title: string;
  link: string;
  snippet?: string;
  channel?: string;
  published?: string;
  duration?: string;
}

/**
 * SerpApi response structure for YouTube searches
 */
interface SerpApiYouTubeResponse {
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
    date?: string;
  }>;
}

/**
 * Search for YouTube videos related to a keyword using SerpApi
 * @param keyword - The search keyword
 * @param limit - Maximum number of results (default: 10)
 * @returns Formatted string with YouTube video results
 */
export async function searchYouTubeVideos(
  keyword: string,
  limit: number = 10
): Promise<string> {
  const { formattedResults } = await searchYouTubeVideosWithUrls(
    keyword,
    limit
  );
  return formattedResults;
}

/**
 * Search for YouTube videos and return both formatted results and raw URLs
 * @param keyword - The search keyword
 * @param limit - Maximum number of results (default: 10)
 * @returns Object with formatted results and array of video URLs
 */
export async function searchYouTubeVideosWithUrls(
  keyword: string,
  limit: number = 10
): Promise<{ formattedResults: string; urls: string[] }> {
  try {
    const serpApiKey = process.env.SERPAPI_API_KEY;

    if (!serpApiKey) {
      console.warn("[YouTube] Missing SERPAPI_API_KEY");
      return { formattedResults: "No YouTube results available.", urls: [] };
    }

    console.log(`[YouTube] Searching for: ${keyword}`);

    const searchUrl = new URL("https://serpapi.com/search");
    searchUrl.searchParams.set("engine", "google");
    searchUrl.searchParams.set("api_key", serpApiKey);
    searchUrl.searchParams.set("num", limit.toString());
    searchUrl.searchParams.set("gl", "us");
    searchUrl.searchParams.set("hl", "en");
    searchUrl.searchParams.set("q", `${keyword} site:youtube.com`);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      console.error(
        `[YouTube] SerpApi request failed with status ${response.status}`
      );
      return { formattedResults: "No YouTube results available.", urls: [] };
    }

    const data: SerpApiYouTubeResponse = await response.json();
    const organicResults = data.organic_results || [];

    if (organicResults.length === 0) {
      console.log("[YouTube] No results found");
      return { formattedResults: "No YouTube results available.", urls: [] };
    }

    const videos: YouTubeVideo[] = organicResults
      .filter((result) => result.link && result.link.includes("youtube.com"))
      .map((result) => ({
        title: result.title || "Untitled",
        link: result.link || "",
        snippet: result.snippet || "",
        channel: result.source || "",
        published: result.date || "",
      }))
      .filter((video) => video.link);

    console.log(`[YouTube] Found ${videos.length} videos`);

    const formattedResults = formatYouTubeResults(videos);
    const urls = videos.map((video) => video.link);

    return { formattedResults, urls };
  } catch (error) {
    console.error("[YouTube] Search failed:", error);
    return { formattedResults: "No YouTube results available.", urls: [] };
  }
}

/**
 * Format YouTube results into a readable string for the AI agent
 */
function formatYouTubeResults(videos: YouTubeVideo[]): string {
  if (videos.length === 0) {
    return "No YouTube results available.";
  }

  let formatted = ``;

  videos.forEach((video, index) => {
    formatted += `${index + 1}. ${video.title}\n`;
    formatted += `   URL: ${video.link}\n`;

    if (video.channel) {
      formatted += `   Channel: ${video.channel}\n`;
    }

    if (video.snippet) {
      formatted += `   Description: ${video.snippet}\n`;
    }

    if (video.published) {
      formatted += `   Published: ${video.published}\n`;
    }

    formatted += "\n";
  });

  return formatted.trim();
}

/**
 * Extract video ID from YouTube URL
 * @param url - YouTube URL
 * @returns Video ID or null if not found
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Handle youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) return videoId;
    }

    // Handle youtu.be/VIDEO_ID
    if (urlObj.hostname === "youtu.be") {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}
