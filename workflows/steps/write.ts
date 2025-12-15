import { generateBlogDraft, type BlogDraft } from "@/lib/writer";
import { runStep, type TimedResult } from "../utils/steps";
import { CompanyProfile } from "@/lib/company";

type WriteDraftStepInput = {
  topic: string;
  keyword: string;
  researchContext: string;
  tone: string;
  blogType: string;
  companyProfile: CompanyProfile;
};

export async function writeDraftStep(
  input: WriteDraftStepInput
): Promise<TimedResult<BlogDraft>> {
  return runStep(
    "write",
    {
      topic: input.topic,
      keyword: input.keyword,
      tone: input.tone,
    },
    async () => {
      "use step";
      const blogDraft = await generateBlogDraft(
        input.topic,
        input.keyword,
        input.researchContext,
        input.companyProfile,
        input.blogType,
        {
          tone: input.tone,
        }
      );
      return {
        value: blogDraft,
        completeData: { draftChars: blogDraft.content.length },
      };
    }
  );
}
