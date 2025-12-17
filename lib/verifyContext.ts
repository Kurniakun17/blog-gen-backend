import { generateObject } from "ai";
import { getModel } from "@/config/models";
import FirecrawlApp from "firecrawl";
import { z } from "zod";

export type VerifiedPage = {
  page_name: string;
  url: string;
};

export type ToolResearchPages = {
  tool_name: string;
  official_page?: string;
  pricing_page?: string;
  verified_pages: VerifiedPage[];
};

/**
 * Step 1: Identify tools and their domains from the outline
 */
async function identifyToolsAndDomains(
  outline: string
): Promise<Array<{ tool_name: string; domain: string }>> {
  const schema = z.object({
    results: z.array(
      z.object({
        tool_name: z
          .string()
          .describe("Official name of the tool or platform"),
        domain: z
          .string()
          .describe(
            "Main domain without protocol (e.g., zendesk.com, freshdesk.com)"
          ),
      })
    ),
  });

  const prompt = `# Role
You are a content research analyst.

# Objective
Analyze the following blog post outline and identify ONLY the tools or platforms that are the **primary subjects of the blog's main argument**.

# Definition: "Primary Tool"
A tool qualifies as a Primary Tool ONLY if it meets at least ONE of the following criteria:

1. It is the main product whose pricing, features, limitations, or value proposition are being analyzed in depth.
2. It is explicitly positioned as an alternative, competitor, or counter-proposal central to the blog's thesis.
3. Multiple sections (H2/H3) are dedicated to evaluating or comparing it.

A tool is NOT a Primary Tool if it is:
- Mentioned only as an integration (e.g. "integrates with Zendesk")
- Used as an example, reference point, or ecosystem context
- Listed incidentally without dedicated sections or analysis

# Constraints
- Return ONLY tools that are central to the blog's main outline and positioning
- Do NOT include secondary tools, integrations, or ecosystems
- If the blog is an "X pricing" or "X alternatives" post, X must always be included

# Output
For each Primary Tool, provide:
1. **tool_name**: Official product name
2. **domain**: Main website domain WITHOUT protocol (e.g., "zendesk.com" not "https://zendesk.com")

<outline>${outline}</outline>`;

  try {
    const result = await generateObject({
      model: getModel("writer"),
      schema,
      prompt,
      temperature: 0.3,
    });

    return result.object.results;
  } catch (error) {
    console.error("[Identify Tools] Error:", error);
    return [];
  }
}

/**
 * Step 2: Extract relevant URLs from landing page markdown
 */
async function extractUrlsFromLandingPage(
  toolName: string,
  domain: string,
  landingPageMarkdown: string
): Promise<ToolResearchPages> {
  const schema = z.object({
    official_page: z
      .string()
      .optional()
      .describe("Main official homepage URL"),
    pricing_page: z.string().optional().describe("Official pricing page URL"),
    verified_pages: z
      .array(
        z.object({
          page_name: z
            .string()
            .describe("Name/type of the page (e.g., AI Agents, Help Center)"),
          url: z.string().describe("Full URL to the page"),
        })
      )
      .describe("All relevant product, feature, and documentation URLs"),
  });

  const prompt = `# Role
You are a URL extraction specialist.

# Objective
Extract all relevant URLs from the landing page markdown for a tool called "${toolName}" (${domain}).

# Instructions
1. Look through all links in the markdown
2. Identify and extract URLs for:
   - **Pricing page** (usually /pricing, /plans, /buy)
   - **Product features** (e.g., /features/ai, /product/ticketing, /service/messaging)
   - **Documentation & Help** (e.g., /docs, /help, /support, /api)
   - **Security & Compliance** (e.g., /security, /trust, /compliance)

# Rules
1. **Only extract URLs from the ${domain} domain** - ignore external links
2. **Use full URLs** - include https:// protocol
3. **Prefer specific feature pages** over generic "features" pages
4. **Skip** navigation links like "About Us", "Blog", "Careers", "Contact", "Login"
5. **Be thorough** - aim to extract 5-10 relevant URLs

# Output
Return a JSON object with:
- official_page: Homepage URL (https://${domain} or https://www.${domain})
- pricing_page: Pricing page URL if found
- verified_pages: Array of all other relevant pages

<landing_page_markdown>
${landingPageMarkdown}
</landing_page_markdown>`;

  try {
    const result = await generateObject({
      model: getModel("parser"),
      schema,
      prompt,
      temperature: 0.1,
    });

    return {
      tool_name: toolName,
      official_page: result.object.official_page || `https://${domain}`,
      pricing_page: result.object.pricing_page,
      verified_pages: result.object.verified_pages || [],
    };
  } catch (error) {
    console.error(
      `[Extract URLs] Error for ${toolName}:`,
      error instanceof Error ? error.message : String(error)
    );

    return {
      tool_name: toolName,
      official_page: `https://${domain}`,
      pricing_page: undefined,
      verified_pages: [],
    };
  }
}

/**
 * Helper: Gather comprehensive research URLs for all primary tools in the outline
 * New approach: Scrape landing pages first, then extract URLs from markdown
 */
export async function gatherResearchUrls(
  outline: string
): Promise<ToolResearchPages[]> {
  try {
    // Step 1: Identify tools and domains from outline
    console.log(`[Gather Research URLs] Step 1: Identifying tools and domains...`);
    const toolsAndDomains = await identifyToolsAndDomains(outline);

    if (toolsAndDomains.length === 0) {
      console.warn(`[Gather Research URLs] No tools identified from outline`);
      return [];
    }

    console.log(
      `[Gather Research URLs] Found ${toolsAndDomains.length} tools:`,
      toolsAndDomains.map((t) => `${t.tool_name} (${t.domain})`).join(", ")
    );

    // Step 2: Scrape landing pages with Firecrawl
    console.log(`[Gather Research URLs] Step 2: Scraping landing pages...`);
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not found. Cannot scrape landing pages.");
      return [];
    }

    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

    const landingPageResults = await Promise.allSettled(
      toolsAndDomains.map(async (tool) => {
        const url = `https://${tool.domain}`;
        console.log(`[Gather Research URLs] Scraping ${url}...`);

        try {
          const result = await firecrawl.scrape(url, {
            formats: ["markdown"],
            onlyMainContent: false, 
            waitFor: 2000,
          });

          return {
            tool_name: tool.tool_name,
            domain: tool.domain,
            markdown: result?.markdown || "",
          };
        } catch (error) {
          console.error(
            `[Gather Research URLs] Failed to scrape ${url}:`,
            error instanceof Error ? error.message : String(error)
          );
          return {
            tool_name: tool.tool_name,
            domain: tool.domain,
            markdown: "",
          };
        }
      })
    );

    // Step 3: Extract URLs from landing page markdown
    console.log(`[Gather Research URLs] Step 3: Extracting URLs from markdown...`);
    const allToolUrls: ToolResearchPages[] = [];

    for (let i = 0; i < landingPageResults.length; i++) {
      const result = landingPageResults[i];

      if (result.status === "fulfilled" && result.value.markdown) {
        console.log(
          `[Gather Research URLs] Extracting URLs for ${result.value.tool_name}...`
        );

        const toolUrls = await extractUrlsFromLandingPage(
          result.value.tool_name,
          result.value.domain,
          result.value.markdown
        );

        allToolUrls.push(toolUrls);

        console.log(
          `[Gather Research URLs] Found ${
            (toolUrls.official_page ? 1 : 0) +
            (toolUrls.pricing_page ? 1 : 0) +
            toolUrls.verified_pages.length
          } URLs for ${result.value.tool_name}`
        );
      } else {
        console.warn(
          `[Gather Research URLs] Skipping ${toolsAndDomains[i].tool_name} - no markdown content`
        );
      }
    }

    const totalUrls = allToolUrls.reduce(
      (sum, tool) =>
        sum +
        (tool.official_page ? 1 : 0) +
        (tool.pricing_page ? 1 : 0) +
        tool.verified_pages.length,
      0
    );

    console.log(
      `[Gather Research URLs] Successfully gathered ${totalUrls} URLs across ${allToolUrls.length} tools`
    );

    return allToolUrls;
  } catch (error) {
    console.error(
      `[Gather Research URLs] ERROR:`,
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error(`[Gather Research URLs] Stack trace:`, error.stack);
    }
    return [];
  }
}

/**
 * Helper: Scrape a URL using Firecrawl
 */
export async function scrapeUrl(
  firecrawl: FirecrawlApp,
  url: string
): Promise<string | null> {
  try {
    console.log(`[Firecrawl] Scraping: ${url}`);
    const result = await firecrawl.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 1000,
    });

    console.log(`[Firecrawl] Success: ${url}`);
    return result?.markdown || null;
  } catch (error) {
    console.error(`[Verify Context] Failed to scrape ${url}:`, error);
    return null;
  }
}
