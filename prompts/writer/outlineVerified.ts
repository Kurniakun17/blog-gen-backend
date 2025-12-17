import { writing_config } from "../../config/writing_config";

export const buildOutlineVerifiedPrompt = ({
  keyword,
  researchContext,
  companyContext,
  blogType,
  outline,
  verifiedContext,
  companyName,
}: {
  keyword: string;
  researchContext: string;
  companyContext: string;
  blogType: string;
  outline: string;
  verifiedContext: string;
  companyName: string;
}): string => {
  const listicleInstruction =
    blogType.toLowerCase() === "listicle"
      ? `- if it's a PRICING LISTICLE of products, make sure to mentioned it in a form of bullet points`
      : "";

  return `You are an experienced SEO content writer tasked with creating a comprehensive, engaging, and SEO-optimized blog post for ${companyName}. Your goal is to **refine and finalize the provided first draft of the outline** to strictly integrate the verified factual details based on the sources from the context, ensuring the final structure is ready for drafting. Your writing should explain AI-related topics while subtly promoting ${companyName}'s services. Aim for a concise, practical, and engaging style that seamlessly integrates ${companyName}'s advantages within the context of the topic.

Here's the writing tips:
<writing_tips>
${writing_config.tips}
</writing_tips>

Here is the original first draft of the outline. You must use this as your starting point and refine it.

<original_outline>
${outline}
</original_outline>

Here is the new, verified factual context (including official URLs) you must integrate to make the outline highly specific and competitive. Use these facts to update headings and key points.

<verified_context>
${verifiedContext}
</verified_context>

When talking about a competitor's limitations, you SHOULD be really SPECIFIC with the facts stated in the context and DO NOT exaggerate limitations just to make ${companyName} looks better.

Here is specific information about ${companyName}'s value proposition, features, and differentiators.

<company_context>
${companyContext}
</company_context>

Here is the Blog type that this blog will be:

<blog_type>
${blogType}
</blog_type>

You must use the following general context to inform all of your information about a product or platform. Ensure you read it in its entirety.

<general_context>
${researchContext}
</general_context>

Ensure you incorporate these target keywords so is optimised to rank in search engines:

<target_keywords>
${keyword}
</target_keywords>

The blog will NOT use marketing fluff but speak how someone would speak verbally in a work setting that is casual but professional. Avoid being cocky, snarky, or overly negative. Just state the facts and observations clearly. For example, if pricing isn't listed, explain why that might matter without sounding dismissive or judgmental.

Before creating the final outline, prepare the outline:

1. List and prioritize key SEO keywords from the context and topic.
2. Break down the topic into logical sections.
3. **Analyze the \`<original_outline>\` and the \`<verified_context>\` to find where specific factual details (URLs, pricing models, limitations) must be integrated.**
4. Identify opportunities to subtly highlight ${companyName}'s advantages using the new facts.
5. Make sure you explicitly have H1, H2, H3 headings and the key points to make for each part

After your preparation, create a detailed blog outline:

- **Refines and finalizes the \`<original_outline>\`** based on the factual evidence in \`<verified_context>\`.
- **PRESERVE all \`[YOUTUBE_VIDEO: url]\` markers** exactly as they appear in the original outline. Do not remove, move, or modify these markers - they indicate pre-placed YouTube video embeds with contextual backing paragraphs.
- Is clear, logical, and easy to understand for a non-technical audience, especially decision-makers like heads of support
- Is logical given the word count limits and explicitly specifies target word count for each section in [] brackets
- Does not double up on sections/repeat the same information
- Strategically incorporates the target SEO keywords in headings (H1, H2, H3) and content
- Concludes with actionable next steps and a clear call to action
- You should not include FAQs yet
${listicleInstruction}
- Make sure to add meta description (140-150 characters), excerpt (140-150 characters), and tags (3-4 tags with comma as separator, and capitalize where needed)
- Make sure to add Anchor text on a verified claim, it must be natural and concise (MAKE SURE THE LINKING TEXT MUST NOT BE MORE THAN 5 WORDS).

Your output of the outline should be a cleanly formatted and concise markdown outline. Do not actually write the blog, just the outline.`;
};
