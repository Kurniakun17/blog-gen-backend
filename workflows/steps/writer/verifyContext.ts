import { runStep, type TimedResult } from "../../utils/steps";
import {
  identifyToolsAndPages,
  findOfficialPages,
  type ToolVerificationPage,
  type OfficialPageResult,
} from "@/lib/verifyContext";
import FirecrawlApp from "firecrawl";

type VerificationQuestion = {
  claim: string;
  question: string;
  answer?: string;
  source?: string;
};

type ScrapedPage = {
  tool: string;
  title: string;
  url: string;
  success: boolean;
  contentLength?: number;
};

type VerifyContextResult = {
  /** Legacy field - kept for backwards compatibility */
  questions: VerificationQuestion[];
  /** Legacy field - kept for backwards compatibility */
  verifiedData: VerificationQuestion[];
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
 * Step 1: Identify Tools and Pages
 * Analyzes the outline to identify which tools/platforms need verification
 */
export async function identifyToolsStep(input: {
  outline: string;
}): Promise<TimedResult<{ tools: ToolVerificationPage[] }>> {
  const outline = input.outline;

  return runStep(
    "identify-tools",
    { outlineLength: outline.length },
    async () => {
      "use step";

      console.log("\n[Identify Tools] Analyzing outline...");
      const tools = await identifyToolsAndPages(outline);

      console.log(`[Identify Tools] Found ${tools.length} tools to verify`);
      tools.forEach((tool) => {
        console.log(
          `  - ${tool.tool_name}: ${tool.verification_pages.length} pages`
        );
      });

      return {
        value: { tools },
        completeData: { toolsCount: tools.length },
      };
    }
  );
}

/**
 * Step 2: Find Official Pages
 * Searches for official URLs for each tool's verification pages
 */
export async function findOfficialPagesStep(input: {
  tools: ToolVerificationPage[];
}): Promise<
  TimedResult<{
    officialPages: Array<{ tool: string; page: OfficialPageResult }>;
  }>
> {
  const tools = input.tools; // Extract before runStep to avoid closure issues

  return runStep(
    "find-official-pages",
    { toolsCount: tools.length },
    async () => {
      "use step";

      console.log("\n[Find Official Pages] Searching for URLs...");
      console.log(
        `[Find Official Pages] Processing ${tools.length} tools in parallel`
      );

      // Process all tools in parallel
      const results = await Promise.allSettled(
        tools.map(async (tool, i) => {
          console.log(
            `[Find Official Pages] [${i + 1}/${tools.length}] Starting: ${
              tool.tool_name
            } with ${tool.verification_pages.length} pages`
          );

          try {
            const pages = await findOfficialPages(
              tool.tool_name,
              tool.verification_pages
            );

            console.log(
              `[Find Official Pages] [${i + 1}/${tools.length}] Found ${
                pages.length
              } URLs for ${tool.tool_name}`
            );

            return {
              tool: tool.tool_name,
              pages,
            };
          } catch (error) {
            console.error(
              `[Find Official Pages] ERROR processing ${tool.tool_name}:`,
              {
                toolName: tool.tool_name,
                verificationPages: tool.verification_pages,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name || typeof error,
              }
            );
            throw error;
          }
        })
      );

      // Collect all successful results
      const allOfficialPages: Array<{
        tool: string;
        page: OfficialPageResult;
      }> = [];

      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          successCount++;
          result.value.pages.forEach((page) => {
            allOfficialPages.push({ tool: result.value.tool, page });
          });
        } else {
          failureCount++;
          console.error(
            `[Find Official Pages] Failed to process tool ${i + 1}/${
              tools.length
            }:`,
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          );
        }
      });

      console.log(
        `[Find Official Pages] Complete: ${successCount}/${tools.length} tools succeeded, ${failureCount} failed`
      );
      console.log(
        `[Find Official Pages] Total: ${allOfficialPages.length} URLs found`
      );

      return {
        value: { officialPages: allOfficialPages },
        completeData: { pagesFound: allOfficialPages.length },
      };
    }
  );
}

/**
 * Step 3: Scrape Official Pages
 * Scrapes all identified official pages using Firecrawl Batch Scrape API
 */
export async function scrapeOfficialPagesStep(input: {
  officialPages: Array<{ tool: string; page: OfficialPageResult }>;
}): Promise<TimedResult<VerifyContextResult>> {
  const officialPages = input.officialPages;

  return runStep(
    "scrape-official-pages",
    { pagesCount: officialPages.length },
    async () => {
      "use step";

      console.log(
        "\n[Scrape Pages] Scraping official pages using batch scrape..."
      );

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        console.warn("FIRECRAWL_API_KEY not found. Skipping scraping.");
        return {
          value: {
            questions: [],
            verifiedData: [],
            scrapedPages: [],
            fullContext: "",
            successfulUrls: [],
            failedUrls: officialPages.map(({ page }) => page.link),
          },
          completeData: {
            pagesScraped: 0,
            pagesFailed: officialPages.length,
            scraped: false,
          },
        };
      }

      const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

      // Extract all URLs for batch scraping
      const urls = officialPages.map(({ page }) => page.link);

      console.log(
        `[Scrape Pages] Starting batch scrape for ${urls.length} URLs...`
      );

      try {        
        const batchResult = await firecrawl.batchScrape(urls, {});

        console.log(`[Scrape Pages] Batch scrape completed`);

        const successfulScrapes: Array<{
          tool: string;
          title: string;
          url: string;
          content: string;
        }> = [];

        const failedUrls: string[] = [];

        // Process batch results
        if (batchResult?.data && Array.isArray(batchResult.data)) {
          batchResult.data.forEach((result: any, index: number) => {
            const officialPage = officialPages[index];

            if (result?.metadata.statusCode === 200 && result?.markdown) {
              successfulScrapes.push({
                tool: officialPage.tool,
                title: result.metadata.title || "",
                url: result.metadata.url || "",
                content: result.markdown || "",
              });
            } else {
              failedUrls.push(officialPage.page.link);
            }
          });
        }

        console.log(
          `[Scrape Pages] Successfully scraped ${successfulScrapes.length}/${officialPages.length} pages`
        );

        // Build verified context from scraped data (legacy format)
        const verifiedData: VerificationQuestion[] = successfulScrapes.map(
          (scrape) => ({
            claim: `${scrape.tool} - ${scrape.title}`,
            question: `Official information about ${scrape.tool}`,
            answer: scrape.content || "No content available",
            source: scrape.url,
          })
        );

        // Build list of all scraped pages with status
        const scrapedPages: ScrapedPage[] = officialPages.map(
          ({ tool, page }) => {
            const scrape = successfulScrapes.find((s) => s.url === page.link);
            const success = !!scrape;

            return {
              tool,
              title: page.title,
              url: page.link,
              success,
              contentLength: scrape?.content?.length,
            };
          }
        );

        // Build full combined context from all scraped pages
        const fullContext = successfulScrapes
          .map((scrape) => {
            return `<context>
  <source>${scrape.url}</source>
  <tool>${scrape.tool}</tool>
  <title>${scrape.title}</title>
  <content>${scrape.content?.trim() || ""}</content>
</context>`;
          })
          .join("\n\n");

        // Extract successful URLs
        const successfulUrls = successfulScrapes.map((s) => s.url);

        console.log(`[Scrape Pages] Success: ${successfulScrapes.length}`);
        console.log(`[Scrape Pages] Failed: ${failedUrls.length}`);
        console.log(
          `[Scrape Pages] Context length: ${fullContext.length} chars`
        );

        return {
          value: {
            questions: [],
            verifiedData,
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
        console.error("[Scrape Pages] Batch scrape failed:", error);

        // Return empty results on error
        return {
          value: {
            questions: [],
            verifiedData: [],
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
