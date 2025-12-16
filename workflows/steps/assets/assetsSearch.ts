import { runStep, type TimedResult } from "../../utils/steps";
import { generateText, stepCountIs } from "ai";
import { buildAssetsSearchPrompt } from "@/lib/assets/prompts";
import { getOrCaptureScreenshot } from "@/lib/assets/screenshots";
import { generateNanoBananaAsset } from "@/lib/assets/nano-banana";
import { getModel } from "@/config/models";
import { z } from "zod";

type AssetsSearchStepInput = {
  contentWithAssets: string;
  keyword: string;
  blogType: string;
  redditThreads?: string;
  youtubeResults?: string;
  internalUsage?: boolean;
};

type ToolCallLog = {
  toolName: string;
  timestamp: string;
  input: any;
  success: boolean;
  message: string;
  details?: any;
};

type AssetsSearchResult = {
  contentWithProcessedAssets: string;
  toolCallLogs: ToolCallLog[];
};

/**
 * Step 2: Assets Search
 * Processes <assets> tags using AI agent with screenshots and nano-banana tools
 */
export async function assetsSearchStep(
  input: AssetsSearchStepInput
): Promise<TimedResult<AssetsSearchResult>> {
  return runStep("assets-search", undefined, async () => {
    "use step";

    console.log("\n========== [Assets Search] Starting ==========");
    console.log("Input content length:", input.contentWithAssets.length);
    console.log(
      "Asset tags to process:",
      (input.contentWithAssets.match(/<assets>/g) || []).length
    );
    console.log("Has YouTube results:", !!input.youtubeResults);
    console.log("==============================================\n");

    // Initialize tool call logs array
    const toolCallLogs: ToolCallLog[] = [];

    const searchPrompt = buildAssetsSearchPrompt(
      input.keyword,
      input.blogType,
      input.contentWithAssets,
      input.redditThreads,
      input.youtubeResults,
      input.internalUsage
    );

    // Build tools object - conditionally include Internal Assets Retrieval
    const tools: Record<string, any> = {
      screenshotsIntegration: {
        description:
          'Capture or retrieve screenshots of company landing pages. Use this tool when you encounter an <assets> block with type "screenshot". The tool will search for existing screenshots first, then capture new ones if needed.',
        inputSchema: z.object({
          url: z
            .string()
            .describe(
              "Company landing page URL to capture (e.g., https://www.zendesk.com)"
            ),
          title: z
            .string()
            .describe(
              "Screenshot title/description for file naming (e.g., zendesk-landing-page)"
            ),
          companyName: z
            .string()
            .describe(
              "Company name for searching existing screenshots (e.g., Zendesk)"
            ),
        }),
        execute: async ({
          url,
          title,
          companyName,
        }: {
          url: string;
          title: string;
          companyName: string;
        }) => {
          const logEntry: ToolCallLog = {
            toolName: "screenshotsIntegration",
            timestamp: new Date().toISOString(),
            input: { url, title, companyName },
            success: false,
            message: "",
          };

          console.log("\n[Tool Call] Screenshots Integration");
          console.log("  URL:", url);
          console.log("  Title:", title);
          console.log("  Company:", companyName);

          const result = await getOrCaptureScreenshot(url, title, companyName);

          if (!result) {
            logEntry.success = false;
            logEntry.message = "Failed to capture/retrieve screenshot";
            console.log("  Result: FAILED - Could not capture screenshot");
            toolCallLogs.push(logEntry);

            return {
              success: false,
              message:
                "Failed to capture/retrieve screenshot. Please keep the <assets> block as-is for manual processing.",
            };
          }

          logEntry.success = true;
          logEntry.message = "Screenshot retrieved/captured successfully";
          logEntry.details = { url: result.url, title: result.title };
          console.log("  Result: SUCCESS");
          console.log("  Screenshot URL:", result.url);
          toolCallLogs.push(logEntry);

          return {
            success: true,
            url: result.url,
            title: result.title,
            message: `Screenshot retrieved/captured successfully. Replace the <assets> block with: __SCREENSHOTS::${result.url}::${result.title}::[Brief alt text]__`,
          };
        },
      },
      nanoBananaGeneration: {
        description:
          'Generate visual assets (infographics, workflow diagrams, WorkflowV2) using Gemini AI. Use this tool when you encounter an <assets> block with type "workflow", "workflowV2", or "infographic".',
        inputSchema: z.object({
          assetDescription: z
            .string()
            .describe(
              "The full description from the <assets> block, including the asset type and details."
            ),
        }),
        execute: async ({ assetDescription }: { assetDescription: string }) => {
          const logEntry: ToolCallLog = {
            toolName: "nanoBananaGeneration",
            timestamp: new Date().toISOString(),
            input: { assetDescription },
            success: false,
            message: "",
          };

          console.log("\n[Tool Call] Nano Banana Generation");
          console.log(
            "  Description:",
            assetDescription.substring(0, 100) + "..."
          );

          const result = await generateNanoBananaAsset(assetDescription);

          if (!result) {
            logEntry.success = false;
            logEntry.message = "Failed to generate asset";
            console.log("  Result: FAILED - Could not generate asset");
            toolCallLogs.push(logEntry);

            return {
              success: false,
              message:
                "Failed to generate asset. Please keep the <assets> block as-is for manual processing.",
            };
          }

          logEntry.success = true;
          logEntry.message = "Asset generated successfully";
          logEntry.details = { url: result.url, title: result.title };
          console.log("  Result: SUCCESS");
          console.log("  Asset URL:", result.url);
          console.log("  Asset Title:", result.title);
          toolCallLogs.push(logEntry);

          return {
            success: true,
            url: result.url,
            title: result.title,
            message: `Asset generated successfully. Replace the <assets> block with: __IMAGE::${result.url}::${result.title}::[Brief caption]__`,
          };
        },
      },
    };

    // Add Internal Assets Retrieval tool only if internalUsage is true
    if (input.internalUsage) {
      tools.internalAssetsRetrieval = {
        description: `# Internal Assets Retrieval
This tool allows you to search for available assets on WordPress. Your task is to **identify the correct asset(s) based on the blog content**. You do NOT need to provide URLs; only output the **asset keyword/ID** if required.

## How to Search
1. Use the **base URL** provided in the description to query WordPress media:
https://website-cms.eesel.ai/wp-json/wp/v2/media?search=<search-term>&per_page=20
2. Use the **product name first** as the search term to filter available assets.
3. Use the **title of the blog section** as a reference to select the most relevant asset from the search results.

## Guidelines
- Focus only on finding the **right asset for each part of the blog**.
- Output **keyword/ID**, not the full URL.
- Only include assets where they **enhance the content** (screenshots, workflows, infographics, etc.).
- Do NOT change, rewrite, or remove any content from the blog.1

## Example
If the content is heavily mentioning about Claude Code and it's really relevant to the context, you can search for
https://website-cms.eesel.ai/wp-json/wp/v2/media?search=Claude+Code
Note that you should do short searches and not long ones cos the search is quite bad. For instance, don't search for https://website-cms.eesel.ai/wp-json/wp/v2/media?search=eesel+AI+agents+and+AI+Copilot cos that is quite long and unlikely to return results but do 2 searches in this case. One for https://website-cms.eesel.ai/wp-json/wp/v2/media?search=eesel+AI+agents and another search for https://website-cms.eesel.ai/wp-json/wp/v2/media?search=eesel+AI+Copilot

## Output Format
If the selected media type is an image, then use this as an output
__IMAGE::[URL]::[TITLE (with spaces between word)]::[Caption containing the keyword and brief description of asset]__
Or If the selected media type is a video, then use this as an output
__IMAGE::[URL]::[TITLE (with spaces between word)]::[Caption containing the keyword and brief description of asset]__
> Notes:
> - Only insert assets between paragraphs.
> - Never place two assets in a row.
> - Always include **alt text** and **alt title** containing the focus keyword.
> - ALWAYS make sure the caption matches the content of the asset.

## Caption Requirements
**IMPORTANT**: When creating the caption for the selected asset:
1. **Use the alt text** from the selected image/video as your base (the \`altText\` field from the search results)
2. **Improvise and enhance** the alt text to better match the surrounding blog content context
3. **Keep it concise** but descriptive (1-2 sentences max)
4. **Include relevant keywords** from the blog section where the asset will be placed
5. **Make it natural** - the caption should flow with the blog content and provide context for readers

Example:
- Original alt text: "eesel AI dashboard interface"
- Enhanced caption: "eesel AI's intuitive dashboard interface streamlines workflow management and team collaboration"`,
        inputSchema: z.object({
          searchTerm: z.string().describe(
            `1. Use the **base URL** provided in the description to query WordPress media:
https://website-cms.eesel.ai/wp-json/wp/v2/media?search=<search-term>&per_page=20
2. Use the **product name first** as the search term to filter available assets.
3. Use the **title of the blog section** as a reference to select the most relevant asset from the search results.`
          ),
        }),
        execute: async ({ searchTerm }: { searchTerm: string }) => {
          const logEntry: ToolCallLog = {
            toolName: "internalAssetsRetrieval",
            timestamp: new Date().toISOString(),
            input: { searchTerm },
            success: false,
            message: "",
          };

          console.log("\n[Tool Call] Internal Assets Retrieval");
          console.log("  Search Term:", searchTerm);

          try {
            const url = `https://website-cms.eesel.ai/wp-json/wp/v2/media?search=${encodeURIComponent(
              searchTerm
            )}&per_page=20`;
            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
              logEntry.success = false;
              logEntry.message = `No assets found for "${searchTerm}"`;
              console.log("  Result: NOT FOUND - No assets in WordPress media");
              toolCallLogs.push(logEntry);

              return {
                success: false,
                message: `No assets found for "${searchTerm}". Try a different search term or use Screenshots Integration as fallback.`,
              };
            }

            // Return the list of available assets
            const assets = data
              .filter((item: any) => {
                const title = item.title?.rendered || "";
                return !title.startsWith("Screenshots");
              })
              .map((item: any) => ({
                id: item.id,
                title: item.title?.rendered || "Untitled",
                url: item.source_url || "",
                mediaType: item.media_type || "image",
                altText: item.alt_text || "",
              }));

            if (assets.length === 0) {
              logEntry.success = false;
              logEntry.message = `No relevant assets found (screenshots excluded)`;
              console.log("  Result: NOT FOUND - Only screenshots available");
              toolCallLogs.push(logEntry);

              return {
                success: false,
                message: `No relevant assets found for "${searchTerm}" (screenshots excluded). Try Screenshots Integration.`,
              };
            }

            logEntry.success = true;
            logEntry.message = `Found ${assets.length} asset(s)`;
            logEntry.details = { assetCount: assets.length, assets };
            console.log("  Result: SUCCESS");
            console.log("  Assets Found:", assets.length);
            assets.forEach((asset: any, idx: number) => {
              console.log(
                `    ${idx + 1}. ${asset.title} (${asset.mediaType})`
              );
            });
            toolCallLogs.push(logEntry);

            return {
              success: true,
              assets,
              message: `Found ${assets.length} asset(s) for "${searchTerm}". Select the most relevant one and format it as:\n- For images: __IMAGE::[url]::[title]::[brief caption]__\n- For videos: __VIDEO::[url]::[title]::[brief caption]__`,
            };
          } catch (error) {
            logEntry.success = false;
            logEntry.message = `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.log("  Result: ERROR -", logEntry.message);
            toolCallLogs.push(logEntry);

            return {
              success: false,
              message: `Error searching WordPress media: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            };
          }
        },
      };
    }

    // Call AI agent with tools
    const assetsSearchResult = await generateText({
      model: getModel("assets"),
      prompt: searchPrompt,
      tools,
      stopWhen: stepCountIs(10),
    });

    const contentWithProcessedAssets = assetsSearchResult.text || "";

    // Log summary of tool calls
    console.log("\n========== [Assets Search] Tool Call Summary ==========");
    console.log("Total Tool Calls:", toolCallLogs.length);

    const successCount = toolCallLogs.filter((log) => log.success).length;
    const failCount = toolCallLogs.filter((log) => !log.success).length;

    console.log("Successful:", successCount);
    console.log("Failed:", failCount);

    if (toolCallLogs.length > 0) {
      console.log("\nDetailed Log:");
      toolCallLogs.forEach((log, idx) => {
        console.log(
          `\n${idx + 1}. ${log.toolName} [${
            log.success ? "SUCCESS" : "FAILED"
          }]`
        );
        console.log(`   Time: ${log.timestamp}`);
        console.log(`   Input:`, JSON.stringify(log.input, null, 2));
        console.log(`   Message: ${log.message}`);
        if (log.details) {
          console.log(`   Details:`, JSON.stringify(log.details, null, 2));
        }
      });
    }
    console.log("\n=======================================================\n");

    return {
      value: {
        contentWithProcessedAssets,
        toolCallLogs,
      },
      completeData: {
        contentChars: contentWithProcessedAssets.length,
        remainingAssetTags: (
          contentWithProcessedAssets.match(/<assets>/g) || []
        ).length,
        manualProcessing: false,
        replacementsApplied: 0,
        toolCallsTotal: toolCallLogs.length,
        toolCallsSuccess: successCount,
        toolCallsFailed: failCount,
      },
    };
  });
}
