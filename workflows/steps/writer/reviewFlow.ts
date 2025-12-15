import { reviewContent } from "@/lib/writer";
import { runStep, type TimedResult } from "../../utils/steps";

type ReviewFlowStepInput = {
  draftBlog: string;
  keyword: string;
};

type ReviewedResult = {
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqs: { question: string; answer: string }[];
  excerpt: string;
  tags: string[];
  prompt: string;
};

export async function reviewFlowStep(
  input: ReviewFlowStepInput
): Promise<TimedResult<ReviewedResult>> {
  return runStep(
    "review-flow",
    {
      keyword: input.keyword,
      draftBlog: input.draftBlog,
    },
    async () => {
      "use step";
      const { metaTitle, metaDescription, content, faqs, tags, excerpt, prompt } =
        await reviewContent(input.draftBlog, input.keyword);
      return {
        value: { metaTitle, metaDescription, content, faqs, tags, excerpt, prompt },
        completeData: {
          metaTitle,
          metaDescription,
          content,
          faqs,
          tags,
          hasMetaTitle: Boolean(metaTitle),
        },
      };
    }
  );
}
