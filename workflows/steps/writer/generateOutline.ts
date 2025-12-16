import { generateOutline } from "@/lib/writer";
import { runStep, type TimedResult } from "../../utils/steps";

type GenerateOutlineStepInput = {
  topic: string;
  keyword: string;
  researchContext: string;
  companyContext: string;
  blogType: string;
  tone?: string;
  customOutline?: string;
  companyName: string;
};

type OutlineResult = {
  outline: string;
  prompt: string;
};

export async function generateOutlineStep(
  input: GenerateOutlineStepInput
): Promise<TimedResult<OutlineResult>> {
  return runStep(
    "generate-outline",
    {
      topic: input.topic,
      keyword: input.keyword,
      hasCustomOutline: !!input.customOutline,
      tone: input.tone,
    },
    async () => {
      "use step";

      // Always generate with AI, but pass custom outline as top priority instruction
      const { outline, prompt } = await generateOutline(
        input.topic,
        input.keyword,
        input.researchContext,
        input.companyContext,
        input.blogType,
        input.companyName,
        input.tone,
        input.customOutline
      );
      return {
        value: { outline, prompt },
        completeData: {
          outlineChars: outline.length,
          hasCustomOutline: !!input.customOutline,
        },
      };
    }
  );
}
