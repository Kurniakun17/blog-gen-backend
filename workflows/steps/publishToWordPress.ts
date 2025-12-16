import { runStep, type TimedResult } from "../utils/steps";
import { formatWordPressHTML, type WordPressOutput } from "@/lib/formatter";
import { stripFAQSection } from "@/lib/utils";

type PublishToWordPressInput = {
  content: string;
  title: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  categoryId: number;
  bannerId: number;
  faqs: { question: string; answer: string }[];
  tags: string[];
  status?: "publish" | "draft"; // Optional: defaults to "publish"
};

type PublishToWordPressResult = {
  content: string;
  categoryId: number;
  bannerId: number;
  postId: number;
  postUrl: string;
  success: boolean;
};

/**
 * Step: Publish to WordPress
 * Formats the blog content and publishes it to WordPress via REST API
 */
export async function publishToWordPressStep(
  input: PublishToWordPressInput
): Promise<TimedResult<PublishToWordPressResult>> {
  return runStep(
    "publish-to-wordpress",
    {
      title: input.title,
      slug: input.slug,
    },
    async () => {
      "use step";

      console.log("\n========== [Publish to WordPress] Starting ==========");
      console.log("Title:", input.title);
      console.log("Slug:", input.slug);
      console.log("Category ID:", input.categoryId);
      console.log("Banner ID:", input.bannerId);
      console.log("=====================================================\n");

      // Strip FAQ sections from content before formatting
      const contentWithoutFAQ = stripFAQSection(input.content);

      if (contentWithoutFAQ.length < input.content.length) {
        console.log("[Publish to WordPress] FAQ section detected and removed");
        console.log(`  Original length: ${input.content.length}`);
        console.log(`  After removal: ${contentWithoutFAQ.length}`);
      }

      const formattedContent: WordPressOutput = await formatWordPressHTML({
        draft: {
          content: contentWithoutFAQ,
          metaTitle: input.title,
          faqs: input.faqs,
          tags: input.tags,
        },
        slug: input.slug,
      });

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_APP_PASSWORD;

      if (!wpUsername || !wpPassword) {
        throw new Error(
          "WordPress credentials not found. Please set WP_USERNAME and WP_APP_PASSWORD environment variables."
        );
      }

      const postStatus = input.status || "publish";

      const urlPattern =
        /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\/[^\s<>"']*/gi;

      const urlPlaceholders: string[] = [];

      const contentWithoutUrls = formattedContent.content.replace(
        urlPattern,
        (match) => {
          urlPlaceholders.push(match);
          return `__URL_PLACEHOLDER_${urlPlaceholders.length - 1}__`;
        }
      );

      const normalizedContent = contentWithoutUrls
        .replace(/\bEesel\b/gi, "eesel")
        .replace(
          /__URL_PLACEHOLDER_(\d+)__/g,
          (_, index) => urlPlaceholders[parseInt(index)]
        );

      const formattedSlug = input.slug.endsWith("-en")
        ? input.slug
        : input.slug + "-en";

      const postData: any = {
        title: formattedContent.title,
        content: normalizedContent,
        slug: formattedSlug,
        excerpt: input.excerpt || "",
        status: postStatus,
        author: Math.random() < 0.5 ? 8 : 16,
        yoast_description: input.metaDescription,
      };

      console.log(`[Publish to WordPress] Status: ${postStatus}`);

      if (formattedContent.categoryId && formattedContent.categoryId > 0) {
        postData.categories = [formattedContent.categoryId];
      }

      // Use bannerId from input (from bannerPicker) if provided, otherwise use formatter's bannerId
      const finalBannerId =
        input.bannerId && input.bannerId > 0
          ? input.bannerId
          : formattedContent.bannerId;

      // Only add featured media if it's valid
      if (finalBannerId && finalBannerId > 0) {
        postData.featured_media = finalBannerId;
        console.log(
          `[Publish to WordPress] Using banner ID: ${finalBannerId}${
            input.bannerId > 0 ? " (from AI picker)" : " (from formatter)"
          }`
        );
      }

      try {
        postData.meta = {
          reviewer: Math.random() < 0.5 ? "4" : "14",
        };
      } catch (e) {
        console.warn("[Publish to WordPress] Meta fields not accessible");
      }

      console.log("\n[Publish to WordPress] Posting to WordPress API...");

      const response = await fetch(
        "https://website-cms.eesel.ai/wp-json/wp/v2/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64"),
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }

        console.error(
          `[Publish to WordPress] Failed to publish: ${response.status} ${response.statusText}`
        );
        console.error("Error details:", errorDetails);

        let helpfulMessage = `Failed to publish to WordPress: ${response.status} ${response.statusText}`;

        if (response.status === 403) {
          if (errorDetails?.code === "rest_cannot_assign_term") {
            helpfulMessage +=
              "\n\nTip: Your WordPress user doesn't have permission to assign categories/tags. Try:\n1. Use an Administrator account\n2. Or remove category/tag assignments from the request\n3. Or grant 'edit_posts' and 'assign_categories' capabilities to your user";
          } else {
            helpfulMessage +=
              "\n\nTip: Check that your WordPress user has sufficient permissions (Editor or Administrator role)";
          }
        } else if (response.status === 401) {
          helpfulMessage +=
            "\n\nTip: Check your WP_USERNAME and WP_APP_PASSWORD in .env file";
        }

        throw new Error(helpfulMessage);
      }

      const result = await response.json();
      const postId = result.id;
      const postUrl = result.link || formattedContent.liveBlogURL;

      console.log("\n========== [Publish to WordPress] Completed ==========");
      console.log("Post ID:", postId);
      console.log("Post URL:", postUrl);
      console.log("======================================================\n");

      return {
        value: {
          content: normalizedContent,
          postId,
          postUrl,
          success: true,
          categoryId: formattedContent.categoryId,
          bannerId: formattedContent.bannerId,
        },
        completeData: {
          postId,
          postUrl,
        },
      };
    }
  );
}
