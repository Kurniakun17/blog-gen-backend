import { NextRequest, NextResponse } from "next/server";
import { callOpenAIWithSearch } from "@/lib/verifyContext";
import { generateObject } from "ai";
import { getModel } from "@/config/models";
import { z } from "zod";

/**
 * Test endpoint for OpenAI Web Search
 *
 * Usage:
 * POST /api/test-search-urls
 * Body: {
 *   "tool_name": "My AskAI",
 *   "verification_pages": [
 *     "Pricing Page",
 *     "Features Page",
 *     "Integrations Page",
 *     "Help Center / Documentation",
 *     "About Us Page"
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.tool_name) {
      return NextResponse.json(
        { error: "Missing required field: tool_name" },
        { status: 400 }
      );
    }

    if (!body.verification_pages || !Array.isArray(body.verification_pages)) {
      return NextResponse.json(
        { error: "Missing or invalid field: verification_pages (must be array)" },
        { status: 400 }
      );
    }

    const toolName = body.tool_name;
    const verificationPages = body.verification_pages;

    console.log("\n========== [Test] Search URLs ==========");
    console.log("Tool Name:", toolName);
    console.log("Verification Pages:", verificationPages);
    console.log("========================================\n");

    // Same system prompt used in findOfficialPages
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

    // Same user prompt used in findOfficialPages
    const userPrompt = `# Input Data
<tool>${toolName}</tool>
<pages_to_get>${verificationPages.join(", ")}</pages_to_get>`;

    const startTime = Date.now();

    console.log("\n[Test] Step 1: Calling gpt-5-search-api for web search...");
    const responseText = await callOpenAIWithSearch(systemPrompt, userPrompt);

    console.log("\n[Test] Search response (first 500 chars):");
    console.log(responseText.substring(0, 500));

    console.log("\n[Test] Step 2: Parsing with GPT-4o-mini via AI SDK...");

    // Use AI SDK's generateObject with GPT-4o-mini for structured parsing
    const schema = z.object({
      results: z.array(
        z.object({
          title: z.string().describe("Title of the page"),
          link: z.string().describe("URL to the official page"),
          snippet: z.string().describe("Brief description of the page content"),
        })
      ),
    });

    const parsePrompt = `Extract the search results from the following text and format them according to the schema.

The text may contain introductory phrases, markdown formatting, or extra content. Your job is to extract ONLY the relevant search results with title, link, and snippet information.

Search response text:
${responseText}`;

    const parseResult = await generateObject({
      model: getModel("parser"),
      schema,
      prompt: parsePrompt,
      temperature: 0.1,
    });

    const parsedResult = parseResult.object;

    const duration = Date.now() - startTime;

    console.log("\n========== [Test] Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Results found:", parsedResult?.results?.length || 0);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      toolName,
      verificationPages,
      duration,
      searchResponse: responseText,
      parsedResult,
      resultsCount: parsedResult?.results?.length || 0,
      method: "gpt-5-search-api + AI SDK generateObject (gpt-4o-mini)",
    });
  } catch (error) {
    console.error("\n[Test] Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint with usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/test-search-urls",
    method: "POST",
    description:
      "Test OpenAI web search using two-step approach: gpt-5-search-api for search + AI SDK generateObject (gpt-4o-mini) for structured parsing",
    requiredFields: {
      tool_name: "Name of the tool/platform to search for",
      verification_pages:
        "Array of page types to find (e.g., 'Pricing Page', 'Features Page')",
    },
    exampleRequest: {
      tool_name: "My AskAI",
      verification_pages: [
        "Pricing Page",
        "Features Page",
        "Integrations Page",
        "Help Center / Documentation",
        "About Us Page",
      ],
    },
    environment: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Not set",
    },
    notes: [
      "Step 1: Uses gpt-5-search-api to perform web search and get results",
      "Step 2: Uses AI SDK's generateObject with gpt-4o-mini to reliably parse results",
      "This endpoint uses the same approach as the findOfficialPages function in lib/verifyContext.ts",
    ],
  });
}
