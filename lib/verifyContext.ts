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

  const prompt = `You are a content research analyst.

Analyze the following blog post outline/draft. Your goal is to identify the primary tools or platforms and define the key kinds of content and pages that should be researched.

For each **Primary Tool**, provide:
1. The official name of the tool.
2. A list of the **page types** (not actual URLs) that must be consulted on the tool's official domain or help center for factual accuracy.

Note that if the blog is for "alternatives" for a tool, then also consider the tool being compared against as a "primary tool" for which context is needed. e.g. for "zendesk alternatives", "zendesk" is still a tool

Also note that if the tool is a specific feature / sub-tool, then consider both as separate e.g. if the draft is on "Gorgias Ai agents", it's interesting to look up "Gorgias AI agent pricing" but also "Gorgias pricing" and other Gorgias context too to have a holistic understanding.

Be greedy about the context you think is relevant. The more context you have the more, detailed and thorough the blog will be.

---

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
async function callOpenAIWithSearch(
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
        const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
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
      `[Find Official Pages] Got response for ${toolName}:`,
      responseText.substring(0, 300)
    );

    // Parse JSON from response - handle introductory text and markdown code blocks
    let jsonText = responseText.trim();

    // First, try to extract JSON from markdown code blocks (with or without introductory text)
    const jsonCodeBlockMatch = jsonText.match(/```json\s*\n([\s\S]*?)\n```/);
    const codeBlockMatch = jsonText.match(/```\s*\n([\s\S]*?)\n```/);

    if (jsonCodeBlockMatch) {
      jsonText = jsonCodeBlockMatch[1].trim();
    } else if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      // No code blocks found, try to extract JSON object directly
      // Look for the first { and last } to extract JSON
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
    }

    jsonText = jsonText.trim();

    console.log(`[Find Official Pages] Parsing JSON for ${toolName}...`);
    const parsed = JSON.parse(jsonText);
    const validated = schema.parse(parsed);

    console.log(`[Find Official Pages] Successfully found ${validated.results.length} URLs for ${toolName}`);
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
    console.warn(`[Find Official Pages] Returning empty results for ${toolName}`);
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
