import { NextRequest, NextResponse } from "next/server";
import { gatherResearchUrlsStep } from "@/workflows/steps/writer/verifyContext";

/**
 * Test endpoint for gathering comprehensive research URLs from outline
 *
 * Usage:
 * POST /api/test-identify-tools
 * Body: {
 *   "outline": "# H1: A guide to MyAskAI pricing in 2025..."
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
    console.log("Outline preview:", outline.substring(0, 200));
    console.log("=================================================\n");

    const startTime = Date.now();

    console.log("\n[Test] Calling gatherResearchUrlsStep...");
    const result = await gatherResearchUrlsStep({ outline });

    const duration = Date.now() - startTime;

    console.log("\n[Test] Result:");
    console.log(JSON.stringify(result.value, null, 2));

    console.log("\n========== [Test] Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Tools found:", result.value.toolsWithUrls.length);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      duration,
      executionTime: result.durationMs,
      toolsWithUrls: result.value.toolsWithUrls,
      toolsCount: result.value.toolsWithUrls.length,
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
    endpoint: "/api/test-identify-tools",
    method: "POST",
    description:
      "Test the gatherResearchUrlsStep function that analyzes blog outlines to identify primary tools and gather comprehensive official URLs for research",
    requiredFields: {
      outline: "Blog post outline or draft text to analyze",
    },
    exampleRequest: {
      outline: `# H1: A guide to MyAskAI pricing in 2025: Plans, costs, and a better alternative

## Meta description
Get a clear breakdown of MyAskAI pricing for 2025. We analyze their plans, hidden costs, and compare it to a better alternative.

## Introduction
MyAskAI has become a popular AI chatbot solution for businesses...

## MyAskAI Pricing Overview
MyAskAI offers several pricing tiers...

## Comparing MyAskAI to Zendesk
When comparing MyAskAI to Zendesk, there are several factors to consider...`,
    },
    responseFormat: {
      success: true,
      duration: "Number (ms)",
      executionTime: "Number (ms) - from workflow step",
      toolsWithUrls: [
        {
          tool_name: "MyAskAI",
          official_page: "https://myaskai.com",
          pricing_page: "https://myaskai.com/pricing",
          verified_pages: [
            {
              page_name: "AI Chatbot",
              url: "https://myaskai.com/features/chatbot",
            },
            {
              page_name: "Help Center",
              url: "https://help.myaskai.com",
            },
            {
              page_name: "API Documentation",
              url: "https://docs.myaskai.com/api",
            },
          ],
        },
      ],
      toolsCount: "Number of tools identified",
    },
    note: "This endpoint uses the gatherResearchUrlsStep from workflows/steps/writer/verifyContext.ts. It combines tool identification and URL discovery into a single comprehensive step.",
  });
}
