import { NextRequest, NextResponse } from "next/server";
import { generateNanoBananaAsset } from "@/lib/assets/nano-banana";

/**
 * Test endpoint for Nano-Banana Integration
 *
 * Usage:
 * POST /api/test-nano-banana
 * Body: {
 *   "description": "A workflow diagram showing the 3-step process..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    // Validate input
    if (!description) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: description",
        },
        { status: 400 }
      );
    }

    console.log("\n========== [Test] Nano-Banana Integration ==========");
    console.log("Description:", description);
    console.log("========================================================\n");

    // Test the integration
    const startTime = Date.now();
    const result = await generateNanoBananaAsset(description);
    const duration = Date.now() - startTime;

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Asset generation failed",
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
      message: "Asset generated successfully",
    });
  } catch (error) {
    console.error("[Test] Nano-Banana test failed:", error);
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
    endpoint: "/api/test-nano-banana",
    method: "POST",
    description: "Test the Nano-Banana Asset Generation tool",
    usage: {
      curl: `curl -X POST http://localhost:3000/api/test-nano-banana \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "A workflow diagram showing the 3-step blog generation process: Research, Write, and Format"
  }'`,
      body: {
        description:
          "A workflow diagram showing the 3-step blog generation process",
      },
    },
    examples: [
      {
        name: "Workflow diagram",
        body: {
          description:
            "A workflow diagram showing the 3-step blog generation process: Research → Write → Format. Use modern flat design with blue and purple gradient colors.",
        },
      },
      {
        name: "Infographic",
        body: {
          description:
            "An infographic comparing 5 AI chatbot platforms: Zendesk, Intercom, Drift, Tidio, and eesel AI. Show features like pricing, integrations, and AI capabilities in a clean comparison table.",
        },
      },
      {
        name: "Feature comparison",
        body: {
          description:
            "A side-by-side comparison showing Notion vs Obsidian features: collaboration, offline mode, plugins, and pricing. Use a clean modern design with icons.",
        },
      },
    ],
  });
}
