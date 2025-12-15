import { runStep, type TimedResult } from "../../utils/steps";
import { generateText } from "ai";
import { getModel } from "@/config/models";

type VerificationQuestion = {
  claim: string;
  question: string;
  answer?: string;
};

type OutlineVerifiedStepInput = {
outline: string;
  keyword: string;
  verifiedData: VerificationQuestion[];
  researchContext: string;
  companyContext: string;
  blogType: string;
};

type OutlineVerifiedResult = {
  verifiedOutline: string;
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
      verifiedDataCount: input.verifiedData.length,
    },
    async () => {
      "use step";

      console.log("\n========== [Outline Verified] Starting ==========");
      console.log("Original outline length:", input.outline.length);
      console.log("Verified data items:", input.verifiedData.length);
      console.log("=================================================\n");

      // Build the verified data context
      const verifiedContext = input.verifiedData
        .map(
          (item, index) => `
Claim ${index + 1}:
Original Claim: ${item.claim}
Question: ${item.question}
Verified Answer: ${item.answer || "Not verified"}
---`
        )
        .join("\n");

      const refinementPrompt = `You are an expert content strategist. Your task is to refine and improve a blog outline using verified factual information.

You will receive:
1. An original outline
2. Verified data from authoritative sources
3. Research context
4. Company context

Your goal is to:
- Review the original outline and cross-reference it with the verified data
- Update any claims, statistics, or facts in the outline to match the verified information
- Ensure all statements are accurate and backed by the verification data
- Maintain the overall structure and flow of the outline
- Keep the same keyword focus and SEO optimization
- DO NOT remove sections unless they are factually incorrect
- DO NOT add new sections unless the verified data strongly suggests improvements

Keyword: ${input.keyword}
Blog Type: ${input.blogType}

Original Outline:
${input.outline}

Verified Data:
${verifiedContext}

Research Context:
${input.researchContext}

Company Context:
${input.companyContext}

Return the refined outline with accurate, verified information. Maintain the same formatting style as the original outline.`;

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
        value: { verifiedOutline },
        completeData: {
          outlineChars: verifiedOutline.length,
          verifiedItemsUsed: input.verifiedData.length,
        },
      };
    }
  );
}
