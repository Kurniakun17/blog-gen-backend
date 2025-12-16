import { NextRequest, NextResponse } from "next/server";
import { publishToWordPressStep } from "@/workflows/steps/publishToWordPress";

/**
 * Test endpoint for WordPress publishing
 *
 * Usage:
 * POST /api/test-wordpress-publish
 * Body: {
 *   "content": "# Sample Blog\n\nThis is sample content...",
 *   "title": "Test Blog Post",
 *   "slug": "test-blog-post",
 *   "metaDescription": "This is a test blog post",
 *   "excerpt": "Test excerpt",
 *   "blogType": "comparison", // Optional, defaults to "comparison"
 *   "categoryId": 31,  // Optional, defaults to 0 (formatter will determine)
 *   "bannerId": 19849, // Optional, defaults to 0 (formatter will determine)
 *   "faqs": [
 *     { "question": "What is this?", "answer": "A test" }
 *   ],
 *   "tags": ["test", "wordpress"]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["content", "title"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    console.log("\n========== [Test] WordPress Publish ==========");
    console.log("Title:", body.title);
    console.log("Slug:", body.slug || "(will be generated)");
    console.log("Content length:", body.content.length);
    console.log("==============================================\n");

    const startTime = Date.now();

    const result = await publishToWordPressStep({
      blogType: body.blogType || "comparison",
      content: body.content,
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/\s+/g, "-"),
      metaDescription: body.metaDescription || "",
      excerpt: body.excerpt || "",
      categoryId: body.categoryId || 0,
      bannerId: body.bannerId || 0,
      faqs: body.faqs || [],
      tags: body.tags || [],
      status: "publish"
    });

    const duration = Date.now() - startTime;

    console.log("\n========== [Test] Complete ==========");
    console.log("Duration:", duration, "ms");
    console.log("Success:", result.value.success);
    console.log("Post ID:", result.value.postId);
    console.log("Post URL:", result.value.postUrl);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      result: result.value,
      duration,
      message: result.value.success
        ? `Successfully published to WordPress! Post ID: ${result.value.postId}`
        : "Failed to publish to WordPress",
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
    endpoint: "/api/test-wordpress-publish",
    method: "POST",
    description: "Test WordPress publishing without running the full workflow",
    requiredFields: {
      content: "Blog content in markdown format",
      title: "Blog title",
    },
    optionalFields: {
      slug: "URL slug (auto-generated from title if not provided)",
      metaDescription: "Meta description for SEO",
      excerpt: "Blog excerpt",
      blogType: 'Blog type (e.g., "comparison", "listicle", defaults to "comparison")',
      categoryId: "WordPress category ID (0 = auto-determine from title)",
      bannerId: "WordPress banner/featured image ID (0 = auto-determine)",
      faqs: "Array of FAQ objects with question and answer",
      tags: "Array of tag strings",
      status: 'Post status: "publish" or "draft" (defaults to "draft" for testing)',
    },
    exampleRequest: {
      content: `# Test Blog Post

This is a sample blog post content.

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Main Content

Here is some main content with details.

## FAQ

### What is this?
This is a test blog post.

### How does it work?
It publishes directly to WordPress.`,
      title: "Test Blog Post - AI Chatbots",
      slug: "test-blog-post-ai-chatbots",
      metaDescription: "This is a test blog post about AI chatbots",
      excerpt: "Learn about AI chatbots in this test post",
      blogType: "comparison",
      categoryId: 0,
      bannerId: 0,
      status: "draft",
      faqs: [
        {
          question: "What is this test?",
          answer: "This is testing WordPress publishing",
        },
      ],
      tags: ["test", "wordpress", "ai"],
    },
    environment: {
      WP_USERNAME: process.env.WP_USERNAME ? "✓ Set" : "✗ Not set",
      WP_APP_PASSWORD: process.env.WP_APP_PASSWORD ? "✓ Set" : "✗ Not set",
    },
  });
}
