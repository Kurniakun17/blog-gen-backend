import { runStep, type TimedResult } from "../../utils/steps";
import {
  gatherResearchUrls,
  type ToolResearchPages,
} from "@/lib/verifyContext";
import FirecrawlApp from "firecrawl";

type ScrapedPage = {
  tool: string;
  title: string;
  url: string;
  success: boolean;
  contentLength?: number;
  category?: string;
};

type VerifyContextResult = {
  /** List of all pages attempted to scrape with success status */
  scrapedPages: ScrapedPage[];
  /** Full combined context from all successfully scraped pages */
  fullContext: string;
  /** Successfully scraped URLs */
  successfulUrls: string[];
  /** Failed scrape URLs */
  failedUrls: string[];
};

/**
 * Step 1: Gather Research URLs
 * Comprehensively identifies tools and gathers all relevant official URLs in one step
 */
export async function gatherResearchUrlsStep(input: {
  outline: string;
}): Promise<TimedResult<{ toolsWithUrls: ToolResearchPages[] }>> {
  const outline = input.outline;

  return runStep(
    "gather-research-urls",
    { outlineLength: outline.length },
    async () => {
      "use step";

      console.log("\n[Gather Research URLs] Analyzing outline and finding URLs...");
      const toolsWithUrls = await gatherResearchUrls(outline);

      console.log(`[Gather Research URLs] Found ${toolsWithUrls.length} tools`);

      let totalUrls = 0;
      toolsWithUrls.forEach((tool) => {
        const urlCount =
          (tool.official_page ? 1 : 0) +
          (tool.pricing_page ? 1 : 0) +
          (tool.verified_pages?.length || 0);
        totalUrls += urlCount;

        console.log(`  - ${tool.tool_name}: ${urlCount} URLs`);
        if (tool.verified_pages?.length > 0) {
          console.log(`    Pages: ${tool.verified_pages.map(p => p.page_name).join(", ")}`);
        }
      });

      console.log(`[Gather Research URLs] Total: ${totalUrls} URLs to scrape`);

      return {
        value: { toolsWithUrls },
        completeData: {
          toolsCount: toolsWithUrls.length,
          totalUrls,
        },
      };
    }
  );
}

/**
 * Step 2: Scrape Research URLs
 * Scrapes all identified URLs using Firecrawl Batch Scrape API
 */
export async function scrapeResearchUrlsStep(input: {
  toolsWithUrls: ToolResearchPages[];
}): Promise<TimedResult<VerifyContextResult>> {
  const toolsWithUrls = input.toolsWithUrls;

  return runStep(
    "scrape-research-urls",
    { toolsCount: toolsWithUrls.length },
    async () => {
      "use step";

      console.log(
        "\n[Scrape URLs] Scraping all research URLs using batch scrape..."
      );

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        console.warn("FIRECRAWL_API_KEY not found. Skipping scraping.");
        return {
          value: {
            scrapedPages: [],
            fullContext: "",
            successfulUrls: [],
            failedUrls: [],
          },
          completeData: {
            pagesScraped: 0,
            pagesFailed: 0,
            scraped: false,
          },
        };
      }

      const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

      // Flatten all URLs from the comprehensive research data
      type UrlMapping = {
        url: string;
        tool: string;
        title: string;
        category: string; // official, pricing, verified
      };

      const urlMappings: UrlMapping[] = [];

      toolsWithUrls.forEach((tool) => {
        // Add official page
        if (tool.official_page) {
          urlMappings.push({
            url: tool.official_page,
            tool: tool.tool_name,
            title: `${tool.tool_name} - Official Page`,
            category: "official",
          });
        }

        // Add pricing page
        if (tool.pricing_page) {
          urlMappings.push({
            url: tool.pricing_page,
            tool: tool.tool_name,
            title: `${tool.tool_name} - Pricing`,
            category: "pricing",
          });
        }

        // Add all verified pages (features, docs, help center, etc.)
        tool.verified_pages?.forEach((page) => {
          urlMappings.push({
            url: page.url,
            tool: tool.tool_name,
            title: `${tool.tool_name} - ${page.page_name}`,
            category: "verified",
          });
        });
      });

      const urls = urlMappings.map((m) => m.url);

      console.log(
        `[Scrape URLs] Starting batch scrape for ${urls.length} URLs across ${toolsWithUrls.length} tools...`
      );

      try {
        const batchResult = await firecrawl.batchScrape(urls, {});

        console.log(`[Scrape URLs] Batch scrape completed`);

        const successfulScrapes: Array<{
          tool: string;
          title: string;
          url: string;
          content: string;
          category: string;
        }> = [];

        const failedUrls: string[] = [];

        // Process batch results
        if (batchResult?.data && Array.isArray(batchResult.data)) {
          batchResult.data.forEach((result: any, index: number) => {
            const mapping = urlMappings[index];

            if (result?.metadata.statusCode === 200 && result?.markdown) {
              successfulScrapes.push({
                tool: mapping.tool,
                title: result.metadata.title || mapping.title,
                url: result.metadata.url || mapping.url,
                content: result.markdown || "",
                category: mapping.category,
              });
            } else {
              failedUrls.push(mapping.url);
            }
          });
        }

        console.log(
          `[Scrape URLs] Successfully scraped ${successfulScrapes.length}/${urls.length} pages`
        );

        // Build list of all scraped pages with status
        const scrapedPages: ScrapedPage[] = urlMappings.map((mapping) => {
          const scrape = successfulScrapes.find((s) => s.url === mapping.url);
          const success = !!scrape;

          return {
            tool: mapping.tool,
            title: mapping.title,
            url: mapping.url,
            success,
            contentLength: scrape?.content?.length,
            category: mapping.category,
          };
        });

        // Build full combined context from all scraped pages
        const fullContext = successfulScrapes
          .map((scrape) => {
            return `<context>
  <source>${scrape.url}</source>
  <tool>${scrape.tool}</tool>
  <title>${scrape.title}</title>
  <category>${scrape.category}</category>
  <content>${scrape.content?.trim() || ""}</content>
</context>`;
          })
          .join("\n\n");

        // Extract successful URLs
        const successfulUrls = successfulScrapes.map((s) => s.url);

        console.log(`[Scrape URLs] Success: ${successfulScrapes.length}`);
        console.log(`[Scrape URLs] Failed: ${failedUrls.length}`);
        console.log(
          `[Scrape URLs] Context length: ${fullContext.length} chars`
        );

        return {
          value: {
            scrapedPages,
            fullContext,
            successfulUrls,
            failedUrls,
          },
          completeData: {
            pagesScraped: successfulScrapes.length,
            pagesFailed: failedUrls.length,
            contextLength: fullContext.length,
          },
        };
      } catch (error) {
        console.error("[Scrape URLs] Batch scrape failed:", error);

        // Return empty results on error
        return {
          value: {
            scrapedPages: [],
            fullContext: "",
            successfulUrls: [],
            failedUrls: urls,
          },
          completeData: {
            pagesScraped: 0,
            pagesFailed: urls.length,
            contextLength: 0,
          },
        };
      }
    }
  );
}
