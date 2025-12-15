import { runStep, type TimedResult } from "../../utils/steps";

type GatherInternalLinksStepInput = {
  companyUrl: string;
  keyword: string;
  maxResults?: number;
};

type InternalLinkResult = {
  title: string;
  link: string;
  snippet?: string;
};

type GatherInternalLinksResult = {
  internalLinks: string[];
  linkDetails: InternalLinkResult[];
};

/**
 * Step: Gather Internal Links
 * Uses SERP API to find relevant internal pages from the company website
 * Search query format: "site:{companyUrl} {topic}"
 */
export async function gatherInternalLinksStep(
  input: GatherInternalLinksStepInput
): Promise<TimedResult<GatherInternalLinksResult>> {
  return runStep(
    "gather-internal-links",
    {
      companyUrl: input.companyUrl,
      keyword: input.keyword,
    },
    async () => {
      "use step";

      console.log("\n========== [Gather Internal Links] Starting ==========");
      console.log("Company URL:", input.companyUrl);
      console.log("keyword:", input.keyword);
      console.log("======================================================\n");

      const serpApiKey = process.env.SERPAPI_API_KEY;
      if (!serpApiKey) {
        console.warn(
          "SERPAPI_API_KEY not found. Skipping internal links gathering."
        );
        return {
          value: { internalLinks: [], linkDetails: [] },
          completeData: { linksFound: 0, skipped: true },
        };
      }

      // Build the site search query
      const searchQuery = `site:${input.companyUrl} ${input.keyword}`;
      const maxResults = input.maxResults || 10;

      try {
        const url = new URL("https://serpapi.com/search");
        url.searchParams.append("engine", "google");
        url.searchParams.append("q", searchQuery);
        url.searchParams.append("api_key", serpApiKey);
        url.searchParams.append("num", maxResults.toString());

        const response = await fetch(url.toString());
        const data = await response.json();

        const linkDetails: InternalLinkResult[] = [];
        const internalLinks: string[] = [];

        // Extract organic results
        if (data.organic_results && Array.isArray(data.organic_results)) {
          for (const result of data.organic_results) {
            if (result.link) {
              const linkDetail: InternalLinkResult = {
                title: result.title || "",
                link: result.link,
                snippet: result.snippet || "",
              };
              linkDetails.push(linkDetail);
              internalLinks.push(result.link);

              console.log(`\n[Gather Internal Links] Found: ${result.title}`);
              console.log(`URL: ${result.link}`);
            }
          }
        }

        console.log(
          `\n========== [Gather Internal Links] Completed ==========`
        );
        console.log(`Found ${internalLinks.length} internal links`);
        console.log(
          "=======================================================\n"
        );

        return {
          value: { internalLinks, linkDetails },
          completeData: {
            linksFound: internalLinks.length,
            maxResults,
          },
        };
      } catch (error) {
        console.error("Failed to gather internal links:", error);
        return {
          value: { internalLinks: [], linkDetails: [] },
          completeData: { linksFound: 0, error: true },
        };
      }
    }
  );
}
