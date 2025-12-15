/**
 * Writer module - handles blog draft generation using AI
 */

import { generateObject, generateText } from "ai";
import { buildSystemPrompt } from "@/prompts/writer/outline";
import { buildWriteDraftPrompt } from "@/prompts/writer/write_draft";
import { buildPolishPrompt } from "@/prompts/writer/polish";
import { buildReviewFlowPrompt } from "@/prompts/writer/review_flow";
import { buildLinkingSourcesPrompt } from "@/prompts/writer/linking_sources";
import { CompanyProfile } from "./company";
import { getModel } from "../config/models";
import { z } from "zod";

const logStep = (message: string) => {
  console.log(`\n========== ${message} ==========\n`);
};

/**
 * BlogDraft interface containing the final markdown content
 */
export interface BlogDraft {
  content: string;
  metaTitle?: string;
  faqs?: { question: string; answer: string }[];
  tags?: string[];
}

/**
 * Step 1: Generate outline for the blog post
 *
 * @param topic - The blog topic
 * @param keyword - The target SEO keyword
 * @param researchContext - Research context from Phase 2
 * @param companyContext - Company profile context
 * @param blogType - Type of blog post
 * @returns Generated outline as string
 */
export async function generateOutline(
  topic: string,
  keyword: string,
  researchContext: string,
  companyContext: string,
  blogType: string,
  tone?: string,
  customOutline?: string
): Promise<string> {
  const topicStr = String(topic);

  logStep(`[Step 1/3] Generating outline for topic: ${topicStr}`);

  const outlinePrompt = buildSystemPrompt({
    topic,
    keyword,
    researchContext,
    companyContext,
    blogType,
    tone,
    customOutline,
  });

  const outlineResult = await generateText({
    model: getModel("writer"),
    prompt: outlinePrompt,
  });

  const outline = outlineResult.text;
  logStep(`[Step 1/3] Outline generated (${outline.length} characters)`);

  return outline;
}

/**
 * Step 2: Write first draft based on outline
 *
 * @param outline - The generated outline
 * @param keyword - The target SEO keyword
 * @param companyContext - Company profile context
 * @param blogType - Type of blog post
 * @returns First draft as string
 */
export async function writeFirstDraft(
  outline: string,
  keyword: string,
  companyContext: string,
  blogType: string,
  tone?: string
): Promise<{ result: string; prompt: string }> {
  logStep(`[Step 2/3] Writing first draft...`);

  const writeDraftPrompt = buildWriteDraftPrompt({
    companyContext,
    blogType,
    outline,
    keyword,
    tone,
  });

  const draftResult = await generateText({
    model: getModel("writer"),
    prompt: writeDraftPrompt,
  });

  const firstDraft = draftResult.text;
  logStep(`[Step 2/3] First draft completed (${firstDraft.length} characters)`);

  return { result: firstDraft, prompt: writeDraftPrompt };
}

/**
 * Step 3: Final polish (humanize + SEO + FAQ + Tags)
 *
 * @param firstDraft - The first draft content
 * @param keyword - The target SEO keyword
 * @param companyName - Name of the company
 * @returns Polished final content as string
 */
export async function polishContent(
  firstDraft: string,
  keyword: string,
  companyName: string
): Promise<{ result: string; prompt: string }> {
  logStep(`[Step 3/3] Final polish (humanize + SEO + FAQ + Tags)...`);

  const polishPrompt = buildPolishPrompt({
    keyword,
    blogDraft: firstDraft,
    companyName,
  });

  const finalResult = await generateText({
    model: getModel("writer"),
    prompt: polishPrompt,
  });

  const polishedContent = finalResult.text;
  logStep(
    `[Step 3/3] Final polish completed (${polishedContent.length} characters)`
  );

  return { result: polishedContent, prompt: polishPrompt };
}

export async function reviewContent(
  draftBlog: string,
  keyword: string
): Promise<{
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqs: { question: string; answer: string }[];
  tags: string[];
  excerpt: string;
  prompt: string;
}> {
  logStep(`[Step 4/4] Review flow...`);

  const reviewFlowPrompt = buildReviewFlowPrompt({
    draftBlog,
    keyword,
  });

  const reviewFlowResult = await generateObject({
    model: getModel("writer"),
    prompt: reviewFlowPrompt,
    schema: z.object({
      metaTitle: z.string(),
      metaDescription: z.string(),
      content: z.string(),
      faqs: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      ),
      tags: z.array(z.string()),
      excerpt: z.string(),
    }),
  });

  const reviewFlowContent = reviewFlowResult.object;
  logStep(
    `[Step 4/4] Review flow completed (${reviewFlowContent.content.length} characters)`
  );

  return { ...reviewFlowContent, prompt: reviewFlowPrompt };
}

/**
 * Step 5: Add internal and external links to the blog content
 *
 * @param blogContent - The blog content to add links to
 * @param blogType - Type of blog post
 * @param internalLinks - List of internal links to use
 * @param externalUrls - List of external URLs to use
 * @param internalUsage - Whether this is for internal eesel AI usage
 * @param verifiedSources - List of verified source URLs to preserve
 * @returns Object containing blog content with embedded links and the prompt used
 */
export async function addLinkingSources(
  blogContent: string,
  blogType: string,
  internalLinks: string[],
  externalUrls: string[],
  internalUsage?: boolean,
  verifiedSources?: string[]
): Promise<{ contentWithLinks: string; prompt: string }> {
  logStep(`[Step 5/5] Adding linking sources...`);

  const linkingPrompt = buildLinkingSourcesPrompt({
    blogInput: blogContent,
    blogType,
    internalLinks,
    externalUrls,
    internalUsage,
    verifiedSources,
  });

  const linkingResult = await generateText({
    model: getModel("writer"),
    prompt: linkingPrompt,
  });

  const contentWithLinks = linkingResult.text;
  logStep(
    `[Step 5/5] Linking sources completed (${contentWithLinks.length} characters)`
  );

  return {
    contentWithLinks,
    prompt: linkingPrompt,
  };
}

/**
 * Generate a blog draft using a 3-step chained AI process
 *
 * @param topic - The blog topic
 * @param keyword - The target SEO keyword
 * @param researchContext - Research context from Phase 2
 * @param companyProfile - Company profile object
 * @param blogType - Type of blog post
 * @param options - Optional generation options including tone
 * @returns A BlogDraft object containing the final polished markdown content
 */
export async function generateBlogDraft(
  topic: string,
  keyword: string,
  researchContext: string,
  companyProfile: CompanyProfile,
  blogType: string,
  options?: { tone?: string }
): Promise<BlogDraft> {
  const companyContext = companyProfile.company_profile;
  const companyName = companyProfile.company_name || "";

  // Step 1: Generate Outline
  const outline = await generateOutline(
    topic,
    keyword,
    researchContext,
    companyContext,
    blogType
  );

  // Step 2: Write First Draft
  const firstDraft = await writeFirstDraft(
    outline,
    keyword,
    companyContext,
    blogType
  );

  // Step 3: Polish Content
  const polishedContent = await polishContent(
    firstDraft.result,
    keyword,
    companyName
  );

  // Step 4: Review Flow
  const reviewedResult = await reviewContent(polishedContent.result, keyword);

  return reviewedResult;
}
