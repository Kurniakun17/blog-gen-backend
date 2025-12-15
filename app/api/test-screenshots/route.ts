import { NextRequest, NextResponse } from "next/server";
import { getOrCaptureScreenshot } from "@/lib/assets/screenshots";

/**
 * Test endpoint for Screenshots Integration
 *
 * Usage:
 * POST /api/test-screenshots
 * Body: {
 *   "url": "https://www.example.com",
 *   "title": "example-landing-page",
 *   "companyName": "Example Company"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, companyName } = body;

    // Validate input
    if (!url || !title || !companyName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: url, title, companyName",
        },
        { status: 400 }
      );
    }

    console.log("\n========== [Test] Screenshots Integration ==========");
    console.log("URL:", url);
    console.log("Title:", title);
    console.log("Company:", companyName);
    console.log("========================================================\n");

    // Test the integration
    const startTime = Date.now();
    const result = await getOrCaptureScreenshot(url, title, companyName);
    const duration = Date.now() - startTime;

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Screenshot capture/retrieval failed",
          durationMs: duration,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        url: result.url,
        title: result.title,
      },
      durationMs: duration,
      message: "Screenshot retrieved/captured successfully",
    });
  } catch (error) {
    console.error("[Test] Screenshots test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to show usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/test-screenshots",
    method: "POST",
    description: "Test the Screenshots Integration tool",
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-screenshots \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.zendesk.com",
    "title": "zendesk-landing-page",
    "companyName": "Zendesk"
  }'`,
      body: {
        url: "https://www.example.com",
        title: "example-landing-page",
        companyName: "Example Company",
      },
    },
    examples: [
      {
        name: "Search existing screenshot",
        body: {
          url: "https://www.zendesk.com",
          title: "zendesk-landing-page",
          companyName: "Zendesk",
        },
      },
      {
        name: "Capture new screenshot",
        body: {
          url: "https://www.obsidian.md",
          title: "obsidian-landing-page",
          companyName: "Obsidian",
        },
      },
    ],
  });
}
