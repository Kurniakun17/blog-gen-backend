import { NextRequest, NextResponse } from "next/server";
import { gatherResearchUrls } from "@/lib/verifyContext";

/**
 * Test endpoint for comprehensive research URL gathering
 *
 * Usage:
 * POST /api/test-search-urls
 * Body: {
 *   "outline": "Your blog post outline here..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.outline) {
      return NextResponse.json(
        { error: "Missing required field: outline" },
        { status: 400 }
      );
    }

    const outline = body.outline;

    console.log("\n========== [Test] Gather Research URLs ==========");
    console.log("Outline length:", outline.length);
    console.log("==================================================\n");

    const startTime = Date.now();

    console.log("\n[Test] Calling gatherResearchUrls...");
    const result = await gatherResearchUrls(outline);

    const duration = Date.now() - startTime;

    // Calculate statistics
    const totalUrls = result.reduce(
      (sum, tool) =>
        sum +
        (tool.official_page ? 1 : 0) +
        (tool.pricing_page ? 1 : 0) +
        (tool.verified_pages?.length || 0),
      0
    );

    console.log("\n========== [Test] Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Tools found:", result.length);
    console.log("Total URLs:", totalUrls);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      duration,
      toolsCount: result.length,
      totalUrls,
      tools: result.map((tool) => ({
        tool_name: tool.tool_name,
        official_page: tool.official_page,
        pricing_page: tool.pricing_page,
        verified_pages: tool.verified_pages,
        url_count:
          (tool.official_page ? 1 : 0) +
          (tool.pricing_page ? 1 : 0) +
          (tool.verified_pages?.length || 0),
      })),
      method: "gatherResearchUrls (comprehensive single-step approach)",
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
      "Test comprehensive research URL gathering from a blog outline. Identifies primary tools and finds all relevant official URLs (homepage, pricing, features, etc.) in a single thorough step.",
    requiredFields: {
      outline: "Blog post outline text",
    },
    exampleRequest: {
      outline: `# Zendesk vs Freshdesk: Which Customer Support Platform is Right for You?

## Introduction
- Overview of customer support platforms
- Why choosing the right tool matters

## Zendesk Overview
### Key Features
- AI Agents
- Ticketing System
- Live Chat & Messaging
- Help Center
- Reporting & Analytics

### Pricing

## Freshdesk Overview
### Key Features
- AI-Powered Automation
- Ticketing
- Omnichannel Support
- Knowledge Base
- Team Collaboration

### Pricing

## Feature Comparison
## Pricing Comparison
## Conclusion`,
    },
    exampleResponse: {
      success: true,
      toolsCount: 2,
      totalUrls: 15,
      tools: [
        {
          tool_name: "Zendesk",
          official_page: "https://www.zendesk.com",
          pricing_page: "https://www.zendesk.com/pricing",
          verified_pages: [
            { page_name: "AI Agents", url: "https://www.zendesk.com/ai" },
            { page_name: "Ticketing", url: "https://www.zendesk.com/service/ticketing" },
            { page_name: "Live Chat", url: "https://www.zendesk.com/service/messaging" },
          ],
          url_count: 5,
        },
      ],
    },
    environment: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Not set",
    },
    notes: [
      "Uses gatherResearchUrls function which combines tool identification and URL discovery",
      "Automatically identifies primary tools from the outline",
      "Finds comprehensive URLs: official pages, pricing, and all verified pages (features, docs, help center, etc.)",
      "Returns structured data with all URLs categorized",
      "Aims for 5-10+ URLs per tool for thorough research coverage",
    ],
  });
}
