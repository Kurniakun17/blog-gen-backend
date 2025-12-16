import { runStep, type TimedResult } from "../../utils/steps";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/config/models";

type MetaTextSplitterInput = {
  verifiedOutline: string;
  slug: string;
  topic: string;
};

type MetaTextSplitterResult = {
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  tags: string[];
  slug: string;
  prompt: string;
};

const metaTextSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()),
});

/**
 * Step: Meta Text Splitter
 * Splits the verified outline into meta title, meta description, excerpt, and tags using AI
 */
export async function metaTextSplitterStep(
  input: MetaTextSplitterInput
): Promise<TimedResult<MetaTextSplitterResult>> {
  return runStep(
    "meta-text-splitter",
    {
      slug: input.slug,
      topic: input.topic,
    },
    async () => {
      "use step";

      console.log("\n========== [Meta Text Splitter] Starting ==========");
      console.log("Slug:", input.slug);
      console.log("Topic:", input.topic);
      console.log("Verified outline length:", input.verifiedOutline.length);
      console.log("=====================================================\n");

      const prompt = `From the given text below map the text into the given output parser json format.
you MUST keep the exact keywords from the given input, DO NOT change the tone/content inside of it

Please note that
- Title SHOULD ALWAYS BE in sentence case EXCEPT proper nouns or brand/tool names (e.g., Zendesk, Salesforce, eesel AI), which must retain their correct capitalization. Please only revise the capitalization of the title. IMPORTANT: If there is a colon (:) or question mark (?) in a title or heading, the first word immediately after the colon or question mark MUST be capitalized EXCEPT for the word 'eesel AI'. For example: "How to use Slack: advanced tips" should become "How to use Slack: Advanced tips" (capitalize "Advanced").
- In the title, keyword should retain proper formatting/capitalisation. For example: "outbound sales crm keyword" should be outbound sales CRM, "jira ai" should be Jira AI, "Meta AI Chatbot" should be "Meta AI chatbot".

The slug must always use: ${input.slug}

If there is no slug available - then you must generate one using the exact match keyword: ${input.topic} but formatted as a slug with - between words.

${input.verifiedOutline}`;

      const result = await generateObject({
        model: getModel("writer"),
        schema: metaTextSchema,
        prompt,
        temperature: 0.3,
      });

      const { metaTitle, metaDescription, excerpt, tags } = result.object;

      console.log("\n========== [Meta Text Splitter] Completed ==========");
      console.log("Meta Title:", metaTitle);
      console.log("Meta Description:", metaDescription);
      console.log("Excerpt:", excerpt);
      console.log("Tags:", tags);
      console.log("======================================================\n");

      return {
        value: {
          metaTitle,
          metaDescription,
          excerpt,
          tags,
          slug: input.slug,
          prompt,
        },
        completeData: {
          metaTitle,
          metaDescription,
          excerpt,
          tags,
          slug: input.slug,
        },
      };
    }
  );
}
