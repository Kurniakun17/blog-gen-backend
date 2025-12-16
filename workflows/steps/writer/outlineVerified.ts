import { runStep, type TimedResult } from "../../utils/steps";
import { generateText } from "ai";
import { getModel } from "@/config/models";
import { buildOutlineVerifiedPrompt } from "@/prompts/writer/outlineVerified";

type OutlineVerifiedStepInput = {
  outline: string;
  keyword: string;
  verifiedContext: string;
  researchContext: string;
  companyContext: string;
  blogType: string;
  companyName: string;
};

type OutlineVerifiedResult = {
  verifiedOutline: string;
  prompt: string;
};

/**
 * Step: Outline Verified
 * Refines the outline using verified data from SERP API to ensure accuracy
 */
export async function outlineVerifiedStep(
  input: OutlineVerifiedStepInput
): Promise<TimedResult<OutlineVerifiedResult>> {
  return runStep(
    "outline-verified",
    {
      keyword: input.keyword,
      verifiedContextLength: input.verifiedContext.length,
    },
    async () => {
      "use step";

      console.log("\n========== [Outline Verified] Starting ==========");
      console.log("Original outline length:", input.outline.length);
      console.log("Verified context length:", input.verifiedContext.length);
      console.log("=================================================\n");

      const refinementPrompt = buildOutlineVerifiedPrompt({
        keyword: input.keyword,
        researchContext: input.researchContext,
        companyContext: input.companyContext,
        blogType: input.blogType,
        outline: input.outline,
        verifiedContext: input.verifiedContext,
        companyName: input.companyName,
      });

      const refinementResult = await generateText({
        model: getModel("writer"),
        prompt: refinementPrompt,
        temperature: 0.5,
      });

      const verifiedOutline = refinementResult.text;

      console.log("\n========== [Outline Verified] Completed ==========");
      console.log("Verified outline length:", verifiedOutline.length);
      console.log(
        "Changes applied:",
        verifiedOutline.length - input.outline.length
      );
      console.log("===================================================\n");

      return {
        value: { verifiedOutline, prompt: refinementPrompt },
        completeData: {
          outlineChars: verifiedOutline.length,
          verifiedContextLength: input.verifiedContext.length,
        },
      };
    }
  );
}
