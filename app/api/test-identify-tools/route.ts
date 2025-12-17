import { NextRequest, NextResponse } from "next/server";
import { identifyToolsStep } from "@/workflows/steps/writer/verifyContext";

/**
 * Test endpoint for identifying tools from outline
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

    console.log("\n========== [Test] Identify Tools ==========");
    console.log("Outline length:", outline.length);
    console.log("Outline preview:", outline.substring(0, 200));
    console.log("===========================================\n");

    const startTime = Date.now();

    console.log("\n[Test] Calling identifyToolsStep...");
    const result = await identifyToolsStep({ outline });

    const duration = Date.now() - startTime;

    console.log("\n[Test] Result:");
    console.log(JSON.stringify(result.value, null, 2));

    console.log("\n========== [Test] Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Tools found:", result.value.tools.length);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      duration,
      tools: result.value.tools,
      toolsCount: result.value.tools.length,
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
      "Test the identifyToolsStep function that analyzes blog outlines to identify tools/platforms that need verification",
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
      tools: [
        {
          tool_name: "MyAskAI",
          verification_pages: [
            "Pricing Page",
            "Features Page",
            "Help Center / Documentation",
          ],
        },
      ],
      toolsCount: "Number of tools identified",
      completeData: "Additional metadata from the workflow step",
    },
    note: "This endpoint uses the identifyToolsStep from workflows/steps/writer/verifyContext.ts",
  });
}
