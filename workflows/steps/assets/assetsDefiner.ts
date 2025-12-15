import { runStep, type TimedResult } from "../../utils/steps";
import { generateText } from "ai";
import { buildAssetsDefinerPrompt } from "@/prompts/assets/assets_definer";
import { getModel } from "@/config/models";

type AssetsDefinerStepInput = {
  content: string;
  keyword: string;
  blogType: string;
  youtubeResults: string;
  internalUsage?: boolean;
};

/**
 * Step 1: Assets Definer
 * Places <assets> tags in the blog content where visual assets should be inserted
 */
export async function assetsDefinerStep(
  input: AssetsDefinerStepInput
): Promise<TimedResult<string>> {
  return runStep("assets-definer", undefined, async () => {
    "use step";

    console.log("\n========== [Assets Definer] Starting ==========");
    console.log("Input content length:", input.content.length);
    console.log("Keyword:", input.keyword);
    console.log("Blog type:", input.blogType);
    console.log("Internal usage:", input.internalUsage);
    console.log("===============================================\n");

    // Build prompt for Assets Definer
    const definerPrompt = buildAssetsDefinerPrompt(
      input.keyword,
      input.internalUsage ?? false,
      input.youtubeResults
    );

    // Call AI to place <assets> tags
    const definerResult = await generateText({
      model: getModel("assets"),
      system: definerPrompt,
      prompt: `# 📌 INPUT BLOG
      The draft blog that you must annotate is inside:
        <draft_blog>
          ${input.content}
        </draft_blog> `,
      temperature: 0.7,
    });

    const contentWithAssets = definerResult.text;

    console.log("\n========== [Assets Definer] Completed ==========");
    console.log("Output length:", contentWithAssets.length);
    console.log(
      "Asset tags found:",
      (contentWithAssets.match(/<assets>/g) || []).length
    );
    console.log(
      "Output preview ",
      contentWithAssets
    );
    console.log("================================================\n");

    return {
      value: contentWithAssets,
      completeData: {
        contentChars: contentWithAssets.length,
        assetTagsCount: (contentWithAssets.match(/<assets>/g) || []).length,
      },
    };
  });
}
