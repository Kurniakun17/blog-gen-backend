import { NextRequest, NextResponse } from "next/server";
import { processAssetTags } from "@/lib/assets/processors";
import { reconstructBlogAssets } from "@/lib/formatter";
import { convertAllPlaceholdersToHTML } from "@/lib/assets/converters";

/**
 * Test endpoint for Assets Process Tags step only
 *
 * Usage:
 * POST /api/test-assets-process-tags
 * Body: {
 *   "contentWithProcessedAssets": "content with __IMAGE:: or __SCREENSHOTS:: placeholders..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentWithProcessedAssets } = body;

    if (!contentWithProcessedAssets) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: contentWithProcessedAssets",
        },
        { status: 400 }
      );
    }

    console.log("\n========== [Test] Assets Process Tags ==========");
    console.log("Input content length:", contentWithProcessedAssets.length);
    console.log("Remaining <assets> tags:", (contentWithProcessedAssets.match(/<assets>/g) || []).length);
    console.log("__IMAGE:: placeholders:", (contentWithProcessedAssets.match(/__IMAGE::/g) || []).length);
    console.log("__SCREENSHOTS:: placeholders:", (contentWithProcessedAssets.match(/__SCREENSHOTS::/g) || []).length);
    console.log("__VIDEO:: placeholders:", (contentWithProcessedAssets.match(/__VIDEO::/g) || []).length);
    console.log("================================================\n");

    const startTime = Date.now();
    let textContent = contentWithProcessedAssets;

    // Step 1: Process any remaining <assets> tags to placeholders
    const replacements = processAssetTags(textContent);

    console.log("[Test] Found", replacements.length, "remaining <assets> tags to process");

    if (replacements.length > 0) {
      // Apply replacements to convert <assets> tags to placeholders
      textContent = reconstructBlogAssets(textContent, replacements);
      console.log("[Test] Applied", replacements.length, "replacements");
    }

    // Step 2: Convert all placeholders to HTML
    console.log("[Test] Converting placeholders to HTML...");
    textContent = convertAllPlaceholdersToHTML(textContent);

    const duration = Date.now() - startTime;

    console.log("\n========== [Test] Assets Process Tags Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Output length:", textContent.length);
    console.log("Remaining <assets> tags:", (textContent.match(/<assets>/g) || []).length);
    console.log("<pre> tags created:", (textContent.match(/<pre>/g) || []).length);
    console.log("Output preview (first 500 chars):", textContent.substring(0, 500) || "(empty)");
    console.log("==========================================================\n");

    return NextResponse.json({
      success: true,
      result: {
        processedContent: textContent,
        stats: {
          inputLength: contentWithProcessedAssets.length,
          outputLength: textContent.length,
          replacementsApplied: replacements.length,
          remainingAssetTags: (textContent.match(/<assets>/g) || []).length,
          preTagsCreated: (textContent.match(/<pre>/g) || []).length,
          durationMs: duration,
        },
        preview: textContent.substring(0, 1000),
      },
      message: "Assets processing completed successfully",
    });
  } catch (error) {
    console.error("[Test] Assets Process Tags test failed:", error);
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
    endpoint: "/api/test-assets-process-tags",
    method: "POST",
    description: "Test the Assets Process Tags conversion logic in isolation",
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-assets-process-tags \\
  -H "Content-Type: application/json" \\
  -d '{
    "contentWithProcessedAssets": "# Blog Title\\n\\n__SCREENSHOTS::https://example.com/image.png::Screenshot Title::This is a screenshot caption__\\n\\nSome content here.\\n\\n__IMAGE::https://example.com/photo.jpg::Photo Title::This is a photo caption__"
  }'`,
    },
    requiredFields: {
      contentWithProcessedAssets:
        "string - Content with __IMAGE::, __SCREENSHOTS::, __VIDEO:: placeholders or <assets> tags",
    },
    placeholderFormats: {
      image: "__IMAGE::url::title::caption__",
      screenshot: "__SCREENSHOTS::url::title::caption__",
      video: "__VIDEO::url::title::caption__",
      assetTag: "<assets>\\nAsset 1: screenshot - Description...\\n</assets>",
    },
    example: {
      contentWithProcessedAssets: `# Best Notion alternatives

__SCREENSHOTS::https://www.screenshotone.com/storage/abc123.png::Confluence landing page::Confluence team collaboration software__

Confluence is a powerful tool for teams.

__IMAGE::https://example.com/workflow.png::Workflow diagram::A visual representation of the workflow__

<assets>
Asset 1: screenshot - Slack landing page
Alt title: Slack homepage
Alt text: Slack communication platform
</assets>`,
    },
  });
}
