/**
 * Research module - handles topic research and data gathering
 */

import FirecrawlApp from "firecrawl";
import { generateObject } from "ai";
import { getModel } from "@/config/models";
import { z } from "zod";

interface SerpApiResult {
  organic_results?: Array<{
    link: string;
    title?: string;
  }>;
}

interface ScrapeResult {
  url: string;
  content: string | null;
}

type RedditIds = { subreddit: string; postId: string };

export type ResearchData = {
  /** Combined research context including all scraped sources */
  context: string;
  /** Raw Reddit threads to help downstream quote insertion */
  redditThreads?: string;
  /** Successfully scraped URLs */
  successfulUrls: string[];
  /** Failed scrape URLs */
  failedUrls: string[];
};

/**
 * Extract official landing page domains from keyword using AI
 * Returns domains if the keyword mentions specific products/tools, otherwise returns empty array
 */
async function extractOfficialDomains(keyword: string): Promise<string[]> {
  const schema = z.object({
    domains: z
      .array(z.string())
      .describe(
        "Official landing page domains (e.g., zendesk.com, freshdesk.com)"
      ),
  });

  const prompt = `# Task
Analyze the following keyword and identify if it mentions specific products or tools as their primary context.

# Keyword
${keyword}

# Instructions
1. If the keyword mentions specific product/tool names (e.g., "Zendesk pricing", "Intercom vs Drift", "Salesforce features"), extract their official domains
2. Return the main domain WITHOUT protocol (e.g., "zendesk.com" not "https://zendesk.com")
3. Only return domains for products/tools that are explicitly mentioned in the keyword
4. If the keyword is generic (e.g., "customer support software", "best CRM tools") and doesn't mention specific products, return an empty array


# Examples
- "Zendesk pricing" → ["zendesk.com"]
- "Intercom vs Drift comparison" → ["intercom.com", "drift.com"]
- "Salesforce CRM features" → ["salesforce.com"]
- "best customer support software" → []
- "how to improve customer service" → []

# Output
Return only the domains array. Do not include explanations.`;

  try {
    const result = await generateObject({
      model: getModel("writer"),
      schema,
      prompt,
      temperature: 0.2,
    });

    const domains = result.object.domains || [];

    if (domains.length > 0) {
      console.log(`[Research] AI extracted domains from keyword: ${domains.join(", ")}`);
    } else {
      console.log(`[Research] No specific product domains found in keyword`);
    }

    return domains;
  } catch (error) {
    console.error(`[Research] Error extracting domains from keyword:`, error);
    return [];
  }
}

function parseRedditIds(url: string): RedditIds | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("reddit.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const commentsIndex = parts.indexOf("comments");
    if (commentsIndex === -1 || commentsIndex + 1 >= parts.length) return null;

    const postId = parts[commentsIndex + 1];
    const rIndex = parts.indexOf("r");
    const subreddit =
      rIndex !== -1 && rIndex + 1 < parts.length ? parts[rIndex + 1] : "";

    if (!postId || !subreddit) return null;
    return { subreddit, postId };
  } catch {
    return null;
  }
}

function extractRedditComments(
  children: any[] | undefined,
  depth = 0,
  maxComments = 20,
  counter: { count: number } = { count: 0 }
): string {
  if (!children || !Array.isArray(children) || counter.count >= maxComments) {
    return "";
  }

  const indent = "  ".repeat(depth);
  let buf = "";

  for (const child of children) {
    if (counter.count >= maxComments) break;
    if (child?.kind !== "t1" || !child.data) continue;

    const comment = child.data;
    if (comment.author === "[deleted]" && comment.body === "[deleted]") {
      continue;
    }

    const author = comment.author || "Unknown";
    const score = comment.score || 0;
    const body = comment.body || "";

    buf += `${indent}${author} (${score}) : ${body}\n\n`;
    counter.count += 1;

    if (comment.replies?.data?.children && counter.count < maxComments) {
      buf += extractRedditComments(
        comment.replies.data.children,
        depth + 1,
        maxComments,
        counter
      );
    }
  }

  return buf;
}

async function scrapeReddit(url: string): Promise<ScrapeResult> {
  const ids = parseRedditIds(url);
  if (!ids) {
    return { url, content: null };
  }

  const apiUrl = `https://www.reddit.com/r/${ids.subreddit}/comments/${ids.postId}/.json`;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "eesel-blog-research/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`Reddit status ${res.status}`);
    const data = (await res.json()) as any[];

    const thread = data?.[0]?.data?.children?.[0]?.data;
    const comments = data?.[1]?.data?.children;

    const title = thread?.title || "";
    const selftext = thread?.selftext || "";
    const author = thread?.author || "";
    const score = thread?.score || 0;
    const subreddit = thread?.subreddit || ids.subreddit;

    const commentsStr = extractRedditComments(comments);

    const content = `<reddit_thread>
## r/${subreddit}: ${title}
**OP:** ${author} (${score})

${selftext}

## Comments:
${commentsStr || "No comments found."}

---</reddit_thread>`;

    return { url, content };
  } catch (error) {
    console.error(`Failed to fetch Reddit thread for ${url}`, error);
    return { url, content: null };
  }
}

/**
 * Research a topic using the provided keyword
 * Performs Google Search via SerpApi and scrapes results using Firecrawl
 * @param keyword - The keyword to research
 * @returns Object containing XML-formatted context from scraped URLs and any Reddit threads found
 */
export async function researchTopic(keyword: string): Promise<ResearchData> {
  console.log(`[RESEARCH] Starting research for keyword: ${keyword}`);
  const MAX_URLS = 20;

  // Step 1: Extract official domains from keyword using AI
  console.log(`[RESEARCH] Step 1: Extracting official domains from keyword...`);
  const aiDomains = await extractOfficialDomains(keyword);
  const aiUrls = aiDomains.map((domain) => `https://${domain}`);

  // Step 2: Google Search using SerpApi
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (!serpApiKey) {
    const error = new Error("SERPAPI_API_KEY environment variable is not set");
    console.error(`[RESEARCH ERROR]`, error);
    throw error;
  }

  const searchUrl = `https://serpapi.com/search?q=${encodeURIComponent(
    keyword
  )}&api_key=${serpApiKey}`;

  console.log(`[RESEARCH] Step 2: Calling SerpApi...`);
  let searchResponse: Response;
  try {
    searchResponse = await fetch(searchUrl);
  } catch (error) {
    console.error(`[RESEARCH ERROR] Failed to fetch from SerpApi:`, error);
    throw new Error(`Failed to fetch from SerpApi: ${error}`);
  }

  if (!searchResponse.ok) {
    const errorBody = await searchResponse.text();
    console.error(
      `[RESEARCH ERROR] SerpApi request failed with status ${searchResponse.status}`,
      `Response body: ${errorBody}`
    );
    throw new Error(
      `SerpApi request failed with status ${searchResponse.status}: ${errorBody}`
    );
  }

  const searchData: SerpApiResult = await searchResponse.json();
  const organicResults = searchData.organic_results || [];

  const serpUrls = organicResults
    .slice(0, MAX_URLS)
    .map((result) => result.link)
    .filter(Boolean);

  // Step 3: Combine AI URLs (first) with SerpAPI URLs
  // Remove duplicates while preserving order (AI URLs first)
  const allUrls = [...aiUrls];
  for (const url of serpUrls) {
    if (!allUrls.includes(url)) {
      allUrls.push(url);
    }
  }

  // Limit to MAX_URLS total
  const selectedUrls = allUrls.slice(0, MAX_URLS);

  if (selectedUrls.length === 0) {
    console.warn("No search results found");
    return {
      context:
        "<context><source>none</source><content>No search results found.</content></context>",
      redditThreads: undefined,
      successfulUrls: [],
      failedUrls: [],
    };
  }

  console.log(
    `[RESEARCH] Combined URLs: ${aiUrls.length} from AI + ${serpUrls.length} from SerpAPI = ${selectedUrls.length} total to scrape`
  );

  // Step 4: Scrape URLs in parallel using Firecrawl
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlApiKey) {
    const error = new Error(
      "FIRECRAWL_API_KEY environment variable is not set"
    );
    console.error(`[RESEARCH ERROR]`, error);
    throw error;
  }

  console.log(`[RESEARCH] Step 4: Initializing Firecrawl...`);
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

  const scrapePromises = selectedUrls.map(
    async (url): Promise<ScrapeResult> => {
      // Reddit has a dedicated JSON endpoint; handle separately to get thread + comments
      if (url.includes("reddit.com")) {
        console.log(`[Reddit] Scraping thread: ${url}`);
        return scrapeReddit(url);
      }

      console.log(`[Firecrawl] Scraping: ${url}`);
      try {
        const result = await firecrawl.scrape(url, {
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 0,
        });

        console.log(`[Firecrawl] Success: ${url}`);
        return {
          url,
          content: result?.markdown || null,
        };
      } catch (error) {
        console.error(`[RESEARCH ERROR] Failed to scrape ${url}:`, error);
        if (error instanceof Error) {
          console.error(`[RESEARCH ERROR] Error message: ${error.message}`);
          console.error(`[RESEARCH ERROR] Error stack: ${error.stack}`);
        }
        return {
          url,
          content: null,
        };
      }
    }
  );

  const scrapeResults = await Promise.allSettled(scrapePromises);

  // Step 5: Process results and filter out failures
  const successfulScrapes: ScrapeResult[] = scrapeResults
    .filter(
      (result): result is PromiseFulfilledResult<ScrapeResult> =>
        result.status === "fulfilled" && result.value.content !== null
    )
    .map((result) => result.value);

  console.log(
    `[RESEARCH] Step 5: Successfully scraped ${successfulScrapes.length} out of ${selectedUrls.length} URLs`
  );

  const successfulUrls = successfulScrapes.map((s) => s.url);
  const failedUrls = selectedUrls.filter(
    (url) => !successfulScrapes.find((s) => s.url === url)
  );

  console.log("[RESEARCH] Scrape Overview:", {
    aiUrlsCount: aiUrls.length,
    attemptedCount: selectedUrls.length,
    successfulCount: successfulUrls.length,
    failedCount: failedUrls.length,
  });

  // Step 6: Format as XML-like string
  if (successfulScrapes.length === 0) {
    return {
      context:
        "<context><source>none</source><content>All scraping attempts failed.</content></context>",
      redditThreads: undefined,
      successfulUrls: [],
      failedUrls,
    };
  }

  const redditThreads = successfulScrapes
    .filter((scrape) => scrape.url.includes("reddit.com"))
    .map((scrape) => scrape.content?.trim())
    .filter((content): content is string => !!content)
    .join("\n\n");

  const xmlOutput = successfulScrapes
    .map((scrape) => {
      // Clean and escape content
      const cleanContent = scrape.content?.trim() || "";

      return `<context>
  <source>${scrape.url}</source>
  <content>${cleanContent}</content>
</context>`;
    })
    .join("\n\n");

  return {
    context: xmlOutput,
    redditThreads: redditThreads || undefined,
    successfulUrls,
    failedUrls,
  };
}
