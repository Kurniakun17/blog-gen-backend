import { polishContent } from "@/lib/writer";
import { runStep, type TimedResult } from "../../utils/steps";

type FinalPolishStepInput = {
  firstDraft: string;
  keyword: string;
  companyName: string;
};

type PolishedResult = {
  polishedContent: { result: string; prompt: string };
};

export async function finalPolishStep(
  input: FinalPolishStepInput
): Promise<TimedResult<PolishedResult>> {
  return runStep(
    "final-polish",
    {
      keyword: input.keyword,
    },
    async () => {
      "use step";
      const polishedContentResult = await polishContent(
        input.firstDraft,
        input.keyword,
        input.companyName
      );
      return {
        value: { polishedContent: polishedContentResult },
        completeData: { polishedChars: polishedContentResult.result.length },
      };
    }
  );
}
