import { runStep, type TimedResult } from "../utils/steps";
import { generateText, stepCountIs } from "ai";
import { getModel } from "@/config/models";
import { z } from "zod";

type BannerPickerStepInput = {
  title: string;
};

type BannerPickerResult = {
  bannerId: number;
};

/**
 * Step: Banner Picker
 * Uses AI agent to select the most relevant banner from WordPress media library
 */
export async function bannerPickerStep(
  input: BannerPickerStepInput
): Promise<TimedResult<BannerPickerResult>> {
  return runStep(
    "banner-picker",
    { title: input.title },
    async () => {
      "use step";

      console.log("\n========== [Banner Picker] Starting ==========");
      console.log("Blog Title:", input.title);
      console.log("==============================================\n");

      // Define the WordPress Banner Retrieval tool
      const tools: Record<string, any> = {
        bannerRetrieval: {
          description: `Search for available Banner assets on WordPress. Use this tool to find banners based on the blog title. IMPORTANT: You MUST include the prefix "Banner - Product - [Product name]" for product-specific searches or "Banner - [topic]" for general topics. Only use the product name exactly as written. Do not substitute with unrelated products.`,
          inputSchema: z.object({
            searchTerm: z
              .string()
              .describe(
                "The search keyword to query WordPress media. Must start with 'Banner - Product - [Product]' for product-specific or 'Banner - [topic]' for general topics."
              ),
          }),
          execute: async ({ searchTerm }: { searchTerm: string }) => {
            console.log(`[Banner Picker] Searching for: ${searchTerm}`);

            const url = `https://website-cms.eesel.ai/wp-json/wp/v2/media?search=${encodeURIComponent(
              searchTerm
            )}&per_page=20`;

            const response = await fetch(url);

            if (!response.ok) {
              console.error(
                `[Banner Picker] Failed to fetch banners: ${response.status}`
              );
              return {
                success: false,
                message: `Failed to fetch banners: ${response.status}`,
              };
            }

            const data = await response.json();

            // Filter to only include Banner assets (exclude Screenshots, icons, etc.)
            const banners = data
              .filter((item: any) => {
                const title = item.title?.rendered || "";
                return title.startsWith("Banner");
              })
              .map((item: any) => ({
                id: item.id,
                title: item.title?.rendered || "",
                url: item.source_url || "",
              }));

            console.log(`[Banner Picker] Found ${banners.length} banners`);

            if (banners.length === 0) {
              return {
                success: false,
                message: `No banners found for "${searchTerm}". Try a different search term or simplified keyword.`,
              };
            }

            return {
              success: true,
              banners,
              message: `Found ${banners.length} banner(s) for "${searchTerm}". Select the most relevant one and return only its ID number.`,
            };
          },
        },
      };

      // AI Agent prompt
      const agentPrompt = `# Model Prompt: Banner Retrieval

You are tasked with enriching blog content by inserting the most relevant Banner asset from WordPress.
Use the provided Banner Retrieval Tool to fetch asset IDs.

## Behavior Rules

For each blog section, determine if a Banner would improve clarity or context.

When searching with the Banner Retrieval Tool:
* you MUST include the prefix of "Banner - Product - [Product name]" if the title is talking about a product specific.
* you MUST include the prefix of "Banner - [title/stuff] " if the title is talking about a general stuff.
Examples: Banner - Product - Claude Code, Banner - Healthcare.

* Only choose assets that are clearly Banner-related.
* Ignore icons, thumbnails, or unrelated media.
* If multiple Banners are returned, select the one most relevant to the blog section title.

* DO NOT Pick assets that have an unrelated product name as the blog title
examples:
Blog title: Anysphere: A complete overview of the $9.9B AI coding startup
Picked Assets: Banner - Product - Tabnine Overview

* Always return the asset ID only (never URLs or other metadata).

## Output Rules

* Insert exactly one Banner asset ID between blog paragraphs.
* Never place two Banners consecutively.
* If no relevant Banner is found:
  * Retry with simplified keywords (up to 3 attempts).
  * If still no relevant assets, output nothing (return 0).
* Do not rewrite or modify the blog content itself.

## Context
The blog title you must find the most suitable Banner for:
${input.title}

## Output Format
You MUST respond with ONLY a number representing the banner ID. For example:
- If you found banner ID 19849, respond with: 19849
- If no relevant banner found, respond with: 0

Do not include any other text, explanation, or formatting. Just the number.`;

      try {
        const result = await generateText({
          model: getModel("writer"),
          prompt: agentPrompt,
          tools,
          stopWhen: stepCountIs(5), // Allow up to 5 tool calls for retries
          temperature: 0.3,
        });

        console.log("\n[Banner Picker] AI Response:", result.text);

        // Extract banner ID from the response
        // The AI should return just a number, but we'll handle various formats
        const bannerIdMatch = result.text.match(/\d+/);
        const bannerId = bannerIdMatch ? parseInt(bannerIdMatch[0], 10) : 0;

        console.log("\n========== [Banner Picker] Completed ==========");
        console.log("Selected Banner ID:", bannerId);
        console.log("===============================================\n");

        return {
          value: { bannerId },
          completeData: {
            bannerId,
            foundBanner: bannerId > 0,
          },
        };
      } catch (error) {
        console.error("[Banner Picker] Error:", error);
        // Return 0 (no banner) on error instead of failing the whole workflow
        return {
          value: { bannerId: 0 },
          completeData: {
            bannerId: 0,
            foundBanner: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        };
      }
    }
  );
}
