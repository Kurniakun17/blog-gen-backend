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
          console.log("  Description:", assetDescription.substring(0, 100) + "...");

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
        description:
          "Search for available assets on WordPress internal media library. Use this tool to find predefined images and videos related to eesel AI features (AI Copilot, AI Agent, AI Triage, etc.) or other internal assets. This tool should be used FIRST before falling back to Screenshots Integration.",
        inputSchema: z.object({
          searchTerm: z
            .string()
            .describe(
              "The search keyword to query WordPress media. Use short, specific terms like 'eesel AI Copilot', 'WorkflowV2', or product names. Avoid long search queries."
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
                // Filter out screenshots that are handled by Screenshots Integration
                const title = item.title?.rendered || "";
                return !title.startsWith("Screenshots - ");
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
              console.log(`    ${idx + 1}. ${asset.title} (${asset.mediaType})`);
            });
            toolCallLogs.push(logEntry);

            return {
              success: true,
              assets,
              message: `Found ${assets.length} asset(s) for "${searchTerm}". Select the most relevant one and format it as:\n- For images: __IMAGE::[url]::[title]::[brief caption]__\n- For videos: __VIDEO::[url]::[title]::[brief caption]__`,
            };
          } catch (error) {
            logEntry.success = false;
            logEntry.message = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
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

    const successCount = toolCallLogs.filter(log => log.success).length;
    const failCount = toolCallLogs.filter(log => !log.success).length;

    console.log("Successful:", successCount);
    console.log("Failed:", failCount);

    if (toolCallLogs.length > 0) {
      console.log("\nDetailed Log:");
      toolCallLogs.forEach((log, idx) => {
        console.log(`\n${idx + 1}. ${log.toolName} [${log.success ? "SUCCESS" : "FAILED"}]`);
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
