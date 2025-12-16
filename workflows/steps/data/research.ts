import { researchTopic, type ResearchData } from "@/lib/research";
import { runStep, type TimedResult } from "../../utils/steps";

type ResearchStepInput = {
  keyword: string;
};

export async function researchStep(
  input: ResearchStepInput
): Promise<TimedResult<ResearchData>> {
  return runStep("research", { keyword: input.keyword }, async () => {
    "use step";
    const keyword = input.keyword;
    console.log("researchStep =========", keyword);
    try {
      const researchData = await researchTopic(input.keyword);
      return {
        value: researchData,
        completeData: { researchChars: researchData.context.length },
      };
    } catch (error) {
      console.error(`[RESEARCH STEP ERROR] Research failed:`, error);
      if (error instanceof Error) {
        console.error(`[RESEARCH STEP ERROR] Message: ${error.message}`);
        console.error(`[RESEARCH STEP ERROR] Stack: ${error.stack}`);
      }
      throw error;
    }
  });
}
