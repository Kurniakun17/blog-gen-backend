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

/**
 * Step 2: Assets Search
 * Processes <assets> tags using AI agent with screenshots and nano-banana tools
 */
export async function assetsSearchStep(
  input: AssetsSearchStepInput
): Promise<TimedResult<string>> {
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
            const result = await getOrCaptureScreenshot(
              url,
              title,
              companyName
            );
            if (!result) {
              return {
                success: false,
                message:
                  "Failed to capture/retrieve screenshot. Please keep the <assets> block as-is for manual processing.",
              };
            }
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
          execute: async ({
            assetDescription,
          }: {
            assetDescription: string;
          }) => {
            const result = await generateNanoBananaAsset(assetDescription);
            if (!result) {
              return {
                success: false,
                message:
                  "Failed to generate asset. Please keep the <assets> block as-is for manual processing.",
              };
            }
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
          'Search for available assets on WordPress internal media library. Use this tool to find predefined images and videos related to eesel AI features (AI Copilot, AI Agent, AI Triage, etc.) or other internal assets. This tool should be used FIRST before falling back to Screenshots Integration.',
        inputSchema: z.object({
          searchTerm: z
            .string()
            .describe(
              "The search keyword to query WordPress media. Use short, specific terms like 'eesel AI Copilot', 'WorkflowV2', or product names. Avoid long search queries."
            ),
        }),
        execute: async ({ searchTerm }: { searchTerm: string }) => {
          try {
            const url = `https://website-cms.eesel.ai/wp-json/wp/v2/media?search=${encodeURIComponent(searchTerm)}&per_page=20`;
            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
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
              return {
                success: false,
                message: `No relevant assets found for "${searchTerm}" (screenshots excluded). Try Screenshots Integration.`,
              };
            }

            return {
              success: true,
              assets,
              message: `Found ${assets.length} asset(s) for "${searchTerm}". Select the most relevant one and format it as:\n- For images: __IMAGE::[url]::[title]::[brief caption]__\n- For videos: __VIDEO::[url]::[title]::[brief caption]__`,
            };
          } catch (error) {
            return {
              success: false,
              message: `Error searching WordPress media: ${error instanceof Error ? error.message : "Unknown error"}`,
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

    return {
      value: contentWithProcessedAssets,
      completeData: {
        contentChars: contentWithProcessedAssets.length,
        remainingAssetTags: (
          contentWithProcessedAssets.match(/<assets>/g) || []
        ).length,
        manualProcessing: false,
        replacementsApplied: 0,
      },
    };
  });
}

export function buildAssetsDefinerPrompt(
  keyword: string,
  isInternalTeam: boolean
): string {
  // Build the priority list based on internal team status
  let priorityList = "";
  if (isInternalTeam) {
    priorityList = `1. **Eesel Internal Assets** (WordPress predefined assets)
2. **WorkflowV2** (WordPress predefined workflows)
3. **Screenshots**
4. **Infographics**`;
  } else {
    priorityList = `1. **WorkflowV2** (WordPress predefined workflows)
2. **Screenshots**
3. **Infographics**`;
  }

  // Build the eesel internal section if needed
  const eesselInternalSection = isInternalTeam
    ? `

## 1. Eesel Internal Assets
Insert these FIRST whenever the blog mentions:
- Eesel AI
- AI Copilot
- AI Agent
- AI Triage
- Blog generator
- Any eesel-owned feature

Placement:
- Insert the asset block **after the first paragraph** introducing the concept.
- If WorkflowV2 is also relevant → insert WorkflowV2 immediately after the internal asset.

Format inside "<assets>":
- Asset 1: eesel_internal_asset – [short description should reflect the exact feature]
- Alt title: [text that includes the exact focus keyword]
- Alt text: [text that includes the exact focus keyword]

These assets come from **WordPress Media** and will be retrieved downstream.

---
`
    : "";

  return `# ASSETS DEFINER — Insert Asset Suggestions Into the Draft Blog

Your task is to analyze the entire blog and insert visual asset suggestions **directly into the blog content**.

You must preserve the blog EXACTLY as written — wording, spacing, headings, formatting — except where infographics require a small contextual adjustment (only in the specific part that anchors the infographic).

Your output MUST return:
1. **The full draft blog**, unchanged except for inserted <assets> … </assets> blocks.
2. Asset blocks must follow this format:

<assets>
Asset 1: [type] – [short description]
Alt title: [text that includes the exact focus keyword]
Alt text: [text that includes the exact focus keyword]
</assets>

You MUST insert assets into correct locations using the mapping rules below.

---

# 🎯 PRIORITY ORDER FOR ASSET INSERTION
When multiple asset types apply, use this strict priority:

${priorityList}

HOWEVER - this priority is overruled by the VARIETY rule. The VARIETY rule means that you should try and use multiple different types of assets, and use screenshots where you can.

---

# 📌 MAPPING RULES FOR EACH ASSET TYPE
${eesselInternalSection}
## ${isInternalTeam ? "2" : "1"}. WorkflowV2
Insert WorkflowV2 (WordPress) when:
- A section explains a process
- A step-by-step logic is described
- A workflow is described verbally

Placement:
- If an Eesel Internal Asset exists in that section → place WorkflowV2 immediately after that internal asset
- Otherwise → place it after the paragraph describing the steps

Format inside <assets>:
- Asset 1: workflow – [description of the workflow]
- Alt title: [text that includes the exact focus keyword]
- Alt text: [text that includes the exact focus keyword]

---

## ${isInternalTeam ? "3" : "2"}. Screenshots
Screenshots MUST ALWAYS be inserted when:
- The blog mentions a product in a heading (e.g., "### 3. Zendesk", "### 4. Tidio")
- The blog is a listicle and introduces a tool
- A platform or product is being introduced for the first time, insert landing page (e.g. "What is Shopify Inbox?")

Screenshots MUST NOT be inserted when:
  1. The screenshot would show features, dashboards, or internal pages
  2. Only landing pages are allowed because the screenshot tool can capture landing pages only

Important Notes:
  1. Do not skip required screenshots.
  2. Do not insert screenshots in any other situation outside the rules above.

Placement rule: **IF a numbered heading is introducing the product → insert the screenshot immediately AFTER that heading.**

Format inside <assets>:
- Asset 1: screenshot – [short description must describe the screenshot context]
- Alt title: [text that includes the exact focus keyword]
- Alt text: [text that includes the exact focus keyword]

---

## ${isInternalTeam ? "4" : "3"}. Infographics
Infographics are ONLY used when the content explains:
- A complex concept
- A multi-step reasoning
- A comparison that benefits from visual clarity

Placement:
- Insert the infographic after the paragraph that provides contextual context.

Special rule:
Infographics are the ONLY asset where you may slightly adjust wording in that paragraph to give the infographic a natural anchor.
This change must be **minimal and strictly contextual**.

Format inside <assets>:
- Asset 1: infographic – [description must detail what the designer should illustrate]
- Alt title: [text that includes the exact focus keyword]
- Alt text: [text that includes the exact focus keyword]

---

# 📌 ASSET INSERTION RULES (GLOBAL)

You must:
- NEVER place two <assets> blocks consecutively
- ALWAYS ensure at least one full paragraph exists between assets
- NEVER place assets inside headings or inside paragraphs
- NEVER modify any existing tables
- ALWAYS include the focus keyword in alt title + alt text
- NEVER remove or rewrite existing content (again: ONLY infographics may slightly expand the contextual paragraph)
- NEVER use the same exact same asset more than once in the same blog.
- DO NOT insert any assets that are not relevant to the blog content.

---

# 📌 FOCUS KEYWORD
The alt title and alt text MUST contain the exact focus keyword:

${keyword}

---

# ✅ FINAL INSTRUCTIONS
YOU ARE NOT TO EDIT THE TONE OR FORMATTING OR WRITING OF THE BLOG IN ANY WAY other than to ADD suggested asset descriptions.
This is the most important command.
Your output will be the SAME blog but with asset suggestions (except for infographics, which may require minimal contextual additions).`;
}
