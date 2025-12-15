import { writeFirstDraft } from "@/lib/writer";
import { runStep, type TimedResult } from "../../utils/steps";

type WriteFirstDraftStepInput = {
  outline: string;
  keyword: string;
  companyContext: string;
  blogType: string;
  tone?: string;
};

type FirstDraftResult = {
  result: string;
  prompt: string;
};

export async function writeFirstDraftStep(
  input: WriteFirstDraftStepInput
): Promise<TimedResult<FirstDraftResult>> {
  return runStep(
    "write-first-draft",
    {
      keyword: input.keyword,
      blogType: input.blogType,
      tone: input.tone,
    },
    async () => {
      "use step";
      const firstDraft = await writeFirstDraft(
        input.outline,
        input.keyword,
        input.companyContext,
        input.blogType,
        input.tone
      );

      return {
        value: firstDraft,
        completeData: { draftChars: firstDraft.result.length },
      };
    }
  );
}
