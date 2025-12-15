import { NextRequest, NextResponse } from "next/server";
import { getOrCaptureScreenshot } from "@/lib/assets/screenshots";
import { generateNanoBananaAsset } from "@/lib/assets/nano-banana";

/**
 * Combined test endpoint for all Assets integrations
 *
 * Usage:
 * POST /api/test-assets
 * Body: {
 *   "type": "screenshot" | "nano-banana" | "both",
 *   "screenshot": { ... },
 *   "nanoBanana": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = "both", screenshot, nanoBanana } = body;

    const results: Record<string, unknown> = {};
    let totalDuration = 0;

    console.log("\n========== [Test] Assets Integration ==========");
    console.log("Test Type:", type);
    console.log("===============================================\n");

    // Test Screenshots
    if (type === "screenshot" || type === "both") {
      if (!screenshot?.url || !screenshot?.title || !screenshot?.companyName) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing screenshot fields: url, title, companyName required",
          },
          { status: 400 }
        );
      }

      console.log("[Screenshots] Testing...");
      const startTime = Date.now();
      const screenshotResult = await getOrCaptureScreenshot(
        screenshot.url,
        screenshot.title,
        screenshot.companyName
      );
      const duration = Date.now() - startTime;
      totalDuration += duration;

      results.screenshot = {
        success: !!screenshotResult,
        result: screenshotResult,
        durationMs: duration,
      };

      console.log(
        `[Screenshots] ${screenshotResult ? "✓ Success" : "✗ Failed"} (${duration}ms)\n`
      );
    }

    // Test Nano-Banana
    if (type === "nano-banana" || type === "both") {
      if (!nanoBanana?.description) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing nanoBanana field: description required",
          },
          { status: 400 }
        );
      }

      console.log("[Nano-Banana] Testing...");
      const startTime = Date.now();
      const nanoBananaResult = await generateNanoBananaAsset(
        nanoBanana.description
      );
      const duration = Date.now() - startTime;
      totalDuration += duration;

      results.nanoBanana = {
        success: !!nanoBananaResult,
        result: nanoBananaResult,
        durationMs: duration,
      };

      console.log(
        `[Nano-Banana] ${nanoBananaResult ? "✓ Success" : "✗ Failed"} (${duration}ms)\n`
      );
    }

    const allSuccess = Object.values(results).every(
      (r: any) => r.success === true
    );

    return NextResponse.json({
      success: allSuccess,
      results,
      totalDurationMs: totalDuration,
      message: allSuccess
        ? "All tests passed"
        : "Some tests failed - check results",
    });
  } catch (error) {
    console.error("[Test] Assets test failed:", error);
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
    endpoint: "/api/test-assets",
    method: "POST",
    description: "Test all Assets integrations (Screenshots & Nano-Banana)",
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-assets \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "both",
    "screenshot": {
      "url": "https://www.zendesk.com",
      "title": "zendesk-landing-page",
      "companyName": "Zendesk"
    },
    "nanoBanana": {
      "description": "A workflow diagram showing the blog generation process"
    }
  }'`,
    },
    examples: [
      {
        name: "Test both integrations",
        body: {
          type: "both",
          screenshot: {
            url: "https://www.intercom.com",
            title: "intercom-landing-page",
            companyName: "Intercom",
          },
          nanoBanana: {
            description:
              "An infographic comparing AI chatbot platforms with pricing and features",
          },
        },
      },
      {
        name: "Test screenshot only",
        body: {
          type: "screenshot",
          screenshot: {
            url: "https://www.obsidian.md",
            title: "obsidian-landing-page",
            companyName: "Obsidian",
          },
        },
      },
      {
        name: "Test nano-banana only",
        body: {
          type: "nano-banana",
          nanoBanana: {
            description:
              "A workflow diagram showing 3 steps: Research → Write → Publish",
          },
        },
      },
    ],
  });
}
