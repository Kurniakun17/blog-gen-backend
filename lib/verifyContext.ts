import { generateObject } from "ai";
import { getModel } from "@/config/models";
import FirecrawlApp from "firecrawl";
import { z } from "zod";

export type ToolVerificationPage = {
  tool_name: string;
  verification_pages: string[];
};

export type OfficialPageResult = {
  title: string;
  link: string;
  snippet: string;
};

/**
 * Helper: Identify tools and required verification pages from outline
 */
export async function identifyToolsAndPages(
  outline: string
): Promise<ToolVerificationPage[]> {
  const schema = z.object({
    results: z.array(
      z.object({
        tool_name: z
          .string()
          .describe("The official name of the tool or platform"),
        verification_pages: z
          .array(z.string())
          .describe(
            "List of page types (not URLs) to consult on the tool's official domain"
          ),
      })
    ),
  });

  const prompt = `# Role
You are a content research analyst.

# Objective
Analyze the following blog post outline or draft and identify ONLY the tools or platforms that are the **primary subjects of the blog’s main argument**.

Your task is to extract the tools that form the **core comparison, evaluation, or positioning** of the article — not tools that are merely mentioned as integrations, examples, or supporting context.

# Definition: "Primary Tool"
A tool qualifies as a Primary Tool ONLY if it meets at least ONE of the following criteria:

1. It is the main product whose pricing, features, limitations, or value proposition are being analyzed in depth.
2. It is explicitly positioned as an alternative, competitor, or counter-proposal central to the blog’s thesis.
3. Multiple sections (H2/H3) are dedicated to evaluating or comparing it.

A tool is NOT a Primary Tool if it is:
- Mentioned only as an integration (e.g. “integrates with Zendesk”)
- Used as an example, reference point, or ecosystem context
- Listed incidentally without dedicated sections or analysis

If a tool fails the criteria above, it must be excluded entirely.

# Output Requirements
For each **Primary Tool**, provide:

1. **Official product name**
2. **Core verification page types** (NOT URLs) that should be researched on the tool’s official site or help center to ensure factual accuracy

Examples of valid page types:
- Pricing page
- Plan comparison page
- Product overview page
- Feature documentation
- Help center articles defining billing units or usage limits
- Enterprise or security documentation (SOC 2, compliance), if relevant

# Constraints
- Return ONLY tools that are central to the blog’s main outline and positioning
- Do NOT include secondary tools, integrations, or ecosystems
- Maximum **5 verification page types per tool**
- Maximum **3 primary tools total**
- If the blog is an “X pricing” or “X alternatives” post, X must always be included

# Output Format
Return a concise list structured as:

Primary Tool:
- tool_name:
- verification_pages:
  - Page type 1
  - Page type 2
  - Page type 3
  (etc.)

Do not add commentary, explanations, or analysis outside this structure.

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
    console.error("[Verify Context] Error identifying tools:", error);
    return [];
  }
}

/**
 * Helper: Call OpenAI Chat API with web search capability
 */
export async function callOpenAIWithSearch(
  system: string,
  prompt: string,
  retries = 3
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  let lastError: Error | null = null;
  const model = "gpt-5-search-api";

  console.log(`[callOpenAIWithSearch] Using search model "${model}"`);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const requestBody = {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      };

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI chat error (${response.status}): ${errorText.slice(0, 500)}`
        );
      }

      type ChatChoice = {
        message?: { content?: string | Array<{ text?: string }> };
      };
      type ChatResponse = { choices?: ChatChoice[] };

      const data = (await response.json()) as ChatResponse;
      const rawContent = data?.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("OpenAI chat response missing message content");
      }

      if (typeof rawContent === "string") {
        return rawContent;
      }

      // Handle array-of-parts structure
      const combined = rawContent
        .map((part) => {
          if (typeof part === "string") return part;
          return (part as any)?.text ?? "";
        })
        .join("")
        .trim();

      if (!combined) {
        throw new Error("OpenAI chat response contained no text content");
      }

      return combined;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `[callOpenAIWithSearch] Attempt ${
            attempt + 1
          }/${retries} failed, retrying in ${backoffMs}ms...`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

/**
 * Helper: Parse search results using GPT-4o-mini with structured output via AI SDK
 */
async function parseSearchResultsWithSchema(
  searchResponse: string,
  schema: z.ZodType<any>
): Promise<any> {
  const parsePrompt = `Extract the search results from the following text and format them according to the schema.

The text may contain introductory phrases, markdown formatting, or extra content. Your job is to extract ONLY the relevant search results with title, link, and snippet information.

Search response text:
${searchResponse}`;

  const result = await generateObject({
    model: getModel("parser"),
    schema,
    prompt: parsePrompt,
    temperature: 0.1,
  });

  return result.object;
}

/**
 * Helper: Find official URLs for verification pages using web search
 */
export async function findOfficialPages(
  toolName: string,
  verificationPages: string[]
): Promise<OfficialPageResult[]> {
  const schema = z.object({
    results: z.array(
      z.object({
        title: z.string().describe("Title of the page"),
        link: z.string().describe("URL to the official page"),
        snippet: z.string().describe("Brief description of the page content"),
      })
    ),
  });

  const systemPrompt = `ALWAYS DO A WEBSEARCH

# Role
You are a rigorous Technical Research Assistant. Your task is to find specific, **primary source URLs** for a list of SaaS tools or platforms or topics.

# Objective
Perform a web search to find the exact official URLs that correspond to the "verification_pages" requirement.

# Constraints & Rules
1. **Primary Sources Only:** You must ONLY return URLs from the official domain of the tool (e.g., \`intercom.com\`, \`help.intercom.com\`, \`developer.intercom.com\`).
2. **No Aggregators:** Do NOT return links to G2, Capterra, TechCrunch, or comparison blogs.
3. **Deep Linking:**
   - If the requirement asks for "Billing Model" or "API", find the specific Help Center or Developer Documentation article, not the generic homepage.
   - If a single page does not satisfy the full requirement, you may provide up to 2 URLs for that specific item.
4. **Format:** Return **ONLY** a valid JSON object matching the schema.
5. DO NOT RETURN ANY INTRODUCTIONAL PHRASES, only focus on returning the JSON OBJECT

If unable to find a particular page DO NOT HALLUCINATE but replace with another relevant or useful page.

Return your response as a JSON object with this structure:
{
  "results": [
    {
      "title": "Example Title",
      "link": "https://example.com",
      "snippet": "Brief description here"
    }
  ]
}`;

  const userPrompt = `# Input Data
<tool>${toolName}</tool>
<pages_to_get>${verificationPages.join(", ")}</pages_to_get>`;

  try {
    console.log(`[Find Official Pages] Starting search for ${toolName}...`);
    const responseText = await callOpenAIWithSearch(systemPrompt, userPrompt);

    console.log(
      `[Find Official Pages] Got search response for ${toolName}:`,
      responseText.substring(0, 300)
    );

    console.log(
      `[Find Official Pages] Parsing with GPT-4o-mini for ${toolName}...`
    );
    const validated = await parseSearchResultsWithSchema(responseText, schema);

    console.log(
      `[Find Official Pages] Successfully found ${validated.results.length} URLs for ${toolName}`
    );
    return validated.results;
  } catch (error) {
    console.error(
      `[Find Official Pages] ERROR for ${toolName}:`,
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error(`[Find Official Pages] Stack trace:`, error.stack);
    }

    // Return empty array instead of throwing to prevent step failure
    console.warn(
      `[Find Official Pages] Returning empty results for ${toolName}`
    );
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
