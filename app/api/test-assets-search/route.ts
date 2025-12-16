import { NextRequest, NextResponse } from "next/server";
import { assetsSearchStep } from "@/workflows/steps/assets/assetsSearch";

/**
 * Test endpoint for Assets Search step only
 *
 * Usage:
 * POST /api/test-assets-search
 * Body: {
 *   "input": {
 *     "contentWithAssets": "...",
 *     "keyword": "...",
 *     "blogType": "...",
 *     "redditThreads": "...",
 *     "youtubeResults": "..."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || !input.contentWithAssets || !input.keyword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: input.contentWithAssets and input.keyword are required",
        },
        { status: 400 }
      );
    }

    console.log("\n========== [Test] Assets Search Step ==========");
    console.log("Content length:", input.contentWithAssets.length);
    console.log("Keyword:", input.keyword);
    console.log("Blog type:", input.blogType || "(not provided)");
    console.log("Has YouTube results:", !!input.youtubeResults);
    console.log("Has Reddit threads:", !!input.redditThreads);
    console.log("===============================================\n");

    const startTime = Date.now();
    const result = await assetsSearchStep({
      contentWithAssets: input.contentWithAssets,
      keyword: input.keyword,
      blogType: input.blogType || "",
      redditThreads: input.redditThreads,
      youtubeResults: input.youtubeResults,
    });
    const duration = Date.now() - startTime;
    const { contentWithProcessedAssets, toolCallLogs } = result.value;

    console.log("\n========== [Test] Assets Search Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Output length:", contentWithProcessedAssets.length || 0);
    console.log(
      "Output is empty:",
      !contentWithProcessedAssets || contentWithProcessedAssets.length === 0
    );
    console.log("===================================================\n");

    return NextResponse.json({
      success:
        !!contentWithProcessedAssets && contentWithProcessedAssets.length > 0,
      result: {
        value: result.value,
        durationMs: result.durationMs,
        // Preview of the output
        preview: contentWithProcessedAssets.substring(0, 500) || "(empty)",
        // Count various placeholders
        screenshotCount: (
          result.value.contentWithProcessedAssets.match(/__SCREENSHOTS::/g) ||
          []
        ).length,
        imageCount: (
          result.value.contentWithProcessedAssets.match(/__IMAGE::/g) || []
        ).length,
        remainingAssetTags: (
          result.value.contentWithProcessedAssets.match(/<assets>/g) || []
        ).length,
      },
      stats: {
        inputLength: input.contentWithAssets.length,
        outputLength: contentWithProcessedAssets.length || 0,
        isEmpty: !contentWithProcessedAssets || contentWithProcessedAssets.length === 0,
        testDurationMs: duration,
      },
      message:
        contentWithProcessedAssets && contentWithProcessedAssets.length > 0
          ? "Assets Search completed successfully"
          : "Assets Search returned empty output - check logs for details",
    });
  } catch (error) {
    console.error("[Test] Assets Search test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
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
    endpoint: "/api/test-assets-search",
    method: "POST",
    description: "Test the Assets Search step in isolation",
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-assets-search \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": {
      "contentWithAssets": "# Blog Title\\n\\n<assets>\\nAsset 1: screenshot - Zendesk landing page\\nAlt title: Zendesk dashboard\\nAlt text: Zendesk customer service platform\\n</assets>\\n\\nSome content here.",
      "keyword": "customer service software",
      "blogType": "listicle",
      "youtubeResults": "Found 3 videos...",
      "redditThreads": "Reddit discussion..."
    }
  }'`,
    },
    requiredFields: {
      "input.contentWithAssets": "string - Blog content with <assets> tags",
      "input.keyword": "string - Focus keyword for SEO",
    },
    optionalFields: {
      "input.blogType": "string - Type of blog (listicle, overview, how-to)",
      "input.redditThreads": "string - Reddit threads data",
      "input.youtubeResults": "string - YouTube search results",
    },
    example: {
      input: {
        contentWithAssets:
          "# Best Notion alternatives\\n\\n<assets>\\nAsset 1: screenshot - Confluence landing page\\nAlt title: Confluence homepage\\nAlt text: Confluence team collaboration software\\n</assets>\\n\\nConfluence is a powerful tool...",
        keyword: "Notion alternatives",
        blogType: "listicle",
        youtubeResults:
          "Found 10 YouTube video(s):\n\n1. Best Notion Alternatives...",
      },
    },
  });
}
