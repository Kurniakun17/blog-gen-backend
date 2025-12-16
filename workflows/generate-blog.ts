import { fetch as workflowFetch } from "workflow";
import type {
  GenerateBlogInput,
  GenerateBlogResponse,
  PipelineDiagnostics,
} from "./types";
import { metadataStep } from "./steps/data/metadata";
import { companyProfileStep } from "./steps/data/companyProfile";
import { researchStep } from "./steps/data/research";
import { youtubeStep } from "./steps/data/youtube";
import { generateOutlineStep } from "./steps/writer/generateOutline";
import { writeFirstDraftStep } from "./steps/writer/writeFirstDraft";
import { finalPolishStep } from "./steps/writer/finalPolish";
import { linkingSourcesStep } from "./steps/writer/linkingSources";
import { reviewFlowStep } from "./steps/writer/reviewFlow";
import { assetsDefinerStep } from "./steps/assets/assetsDefiner";
import { assetsSearchStep } from "./steps/assets/assetsSearch";
import { assetsProcessTagsStep } from "./steps/assets/assetsProcessTags";
import {
  identifyToolsStep,
  findOfficialPagesStep,
  scrapeOfficialPagesStep,
} from "./steps/writer/verifyContext";
import { outlineVerifiedStep } from "./steps/writer/outlineVerified";
import { gatherInternalLinksStep } from "./steps/writer/gatherInternalLinks";
import { publishToWordPressStep } from "./steps/publishToWordPress";
import { mergeResearchContext } from "./utils/context";
import { extractAllLinks } from "@/lib/linkExtractor";

export { generateBlogSchema } from "./types";
export type { GenerateBlogInput, GenerateBlogResponse } from "./types";

export async function generateBlogWorkflow(
  input: GenerateBlogInput
): Promise<GenerateBlogResponse> {
  "use workflow";

  // Ensure downstream clients use workflow-aware fetch for retries and durability.
  globalThis.fetch = workflowFetch as typeof fetch;

  const diagnostics: PipelineDiagnostics = [];

  // Step 1: Metadata and Company Profile
  const [metadataResult, companyProfileResult] = await Promise.all([
    metadataStep(input),
    companyProfileStep(input),
  ]);

  diagnostics.push({
    phase: "metadata",
    durationMs: metadataResult.durationMs,
  });
  diagnostics.push({
    phase: "company_profile",
    durationMs: companyProfileResult.durationMs,
  });

  // Step 2: Research the topic
  const keywordToUse = metadataResult.value.keyword || input.keyword;
  if (!keywordToUse) {
    throw new Error("No keyword provided or derived from metadata.");
  }

  console.log("keywordToUse =========", keywordToUse);

  const researchResult = await researchStep(metadataResult.value);
  diagnostics.push({
    phase: "research",
    durationMs: researchResult.durationMs,
  });

  // Step 3: Search for relevant YouTube videos
  const youtubeResult = await youtubeStep({ keyword: keywordToUse, limit: 10 });
  diagnostics.push({
    phase: "youtube",
    durationMs: youtubeResult.durationMs,
  });

  // Step 4: Compile Research Context
  const researchWithContext = mergeResearchContext(
    researchResult.value.context,
    metadataResult.value.additionalContext,
    metadataResult.value.outline,
    companyProfileResult.value.company_profile
  );

  // Step 5: Generate Outline (or use custom outline from metadata)
  const outlineResult = await generateOutlineStep({
    topic: input.topic,
    keyword: keywordToUse,
    researchContext: researchWithContext,
    companyContext: companyProfileResult.value.company_profile,
    blogType: metadataResult.value.blogType || "overview",
    tone: metadataResult.value.tone,
    customOutline: metadataResult.value.outline,
    companyName: companyProfileResult.value.company_name || "",
  });
  diagnostics.push({
    phase: "generate-outline",
    durationMs: outlineResult.durationMs,
  });

  // Step 5.1a: Identify tools from outline
  const identifyToolsResult = await identifyToolsStep({
    outline: outlineResult.value.outline,
  });
  diagnostics.push({
    phase: "identify-tools",
    durationMs: identifyToolsResult.durationMs,
  });

  // Step 5.1b: Find official pages for identified tools
  const findPagesResult = await findOfficialPagesStep({
    tools: identifyToolsResult.value.tools,
  });
  diagnostics.push({
    phase: "find-official-pages",
    durationMs: findPagesResult.durationMs,
  });

  // Step 5.1c: Scrape official pages
  const verifyContextResult = await scrapeOfficialPagesStep({
    officialPages: findPagesResult.value.officialPages,
  });
  diagnostics.push({
    phase: "scrape-official-pages",
    durationMs: verifyContextResult.durationMs,
  });

  // Step 5.2: Outline Verified - Refine outline with verified data
  const outlineVerifiedResult = await outlineVerifiedStep({
    outline: outlineResult.value.outline,
    keyword: keywordToUse,
    verifiedData: verifyContextResult.value.verifiedData,
    researchContext: researchWithContext,
    companyContext: companyProfileResult.value.company_profile,
    blogType: metadataResult.value.blogType || "overview",
    companyName: companyProfileResult.value.company_name || "",
  });
  diagnostics.push({
    phase: "outline-verified",
    durationMs: outlineVerifiedResult.durationMs,
  });

  // Step 6: Write First Draft (using verified outline with tone)
  const firstDraftResult = await writeFirstDraftStep({
    outline: outlineVerifiedResult.value.verifiedOutline,
    keyword: keywordToUse,
    companyContext: companyProfileResult.value.company_profile,
    blogType: metadataResult.value.blogType || "overview",
    tone: metadataResult.value.tone,
  });
  diagnostics.push({
    phase: "write-first-draft",
    durationMs: firstDraftResult.durationMs,
  });

  // Step 7: Final Polish (Adjust Heading, Humanize, & FAQ)
  const polishResult = await finalPolishStep({
    firstDraft: firstDraftResult.value.result,
    keyword: keywordToUse,
    companyName: companyProfileResult.value.company_name || "",
  });
  diagnostics.push({
    phase: "final-polish",
    durationMs: polishResult.durationMs,
  });

  // Step 8: Linking Sources (Internal & External Links)
  const { internalLinks, externalUrls } = extractAllLinks(
    researchResult.value.context,
    companyProfileResult.value
  );

  // Step 8a: Gather additional internal links using SerpAPI (if company_url is provided)
  let gatheredInternalLinks: string[] = [];
  if (input.company_url) {
    const gatherLinksResult = await gatherInternalLinksStep({
      companyUrl: input.company_url,
      keyword: keywordToUse,
      maxResults: 10,
    });
    diagnostics.push({
      phase: "gather-internal-links",
      durationMs: gatherLinksResult.durationMs,
    });
    gatheredInternalLinks = gatherLinksResult.value.internalLinks;
  }

  // Combine internal links from company profile and gathered links
  const allInternalLinks = [...internalLinks, ...gatheredInternalLinks];

  const verifiedSources = verifyContextResult.value.verifiedData
    .map((item) => item.source)
    .filter((source): source is string => !!source);

  // Step 8b: Linking Sources (Internal & External Links)
  const linkingResult = await linkingSourcesStep({
    blogContent: polishResult.value.polishedContent.result,
    blogType: metadataResult.value.blogType || "",
    internalLinks: allInternalLinks,
    externalUrls: externalUrls,
    internalUsage: input.internalUsage,
    verifiedSources: verifiedSources,
  });

  diagnostics.push({
    phase: "linking-sources",
    durationMs: linkingResult.durationMs,
  });

  console.log("\n========== [Linking Sources] Prompt ==========");
  console.log(linkingResult.value.prompt.substring(0, 500) + "...");
  console.log("==============================================\n");

  // Step 9: Review Flow
  const reviewResult = await reviewFlowStep({
    draftBlog: linkingResult.value.contentWithLinks,
    keyword: keywordToUse,
  });
  diagnostics.push({
    phase: "review-flow",
    durationMs: reviewResult.durationMs,
  });

  // Combine the final reviewed content into a draft result format for compatibility
  const draftResult = {
    value: {
      content: reviewResult.value.content,
      metaTitle: reviewResult.value.metaTitle,
      metaDescription: reviewResult.value.metaDescription,
      excerpt: reviewResult.value.excerpt || "",
      faqs: reviewResult.value.faqs,
      tags: reviewResult.value.tags,
    },
    durationMs:
      outlineResult.durationMs +
      firstDraftResult.durationMs +
      polishResult.durationMs +
      reviewResult.durationMs,
  };

  // Step 10: Assets Definer
  const assetsDefinerResult = await assetsDefinerStep({
    content: draftResult.value.content,
    keyword: keywordToUse,
    blogType: metadataResult.value.blogType || "",
    internalUsage: input.internalUsage,
    youtubeResults: youtubeResult.value.results,
  });
  diagnostics.push({
    phase: "assets-definer",
    durationMs: assetsDefinerResult.durationMs,
  });

  // Step 11: Assets Search
  const assetsSearchResult = await assetsSearchStep({
    contentWithAssets: assetsDefinerResult.value,
    keyword: keywordToUse,
    blogType: metadataResult.value.blogType || "",
    redditThreads: researchResult.value.redditThreads,
    youtubeResults: youtubeResult.value.results,
    internalUsage: input.internalUsage,
  });
  diagnostics.push({
    phase: "assets-search",
    durationMs: assetsSearchResult.durationMs,
  });

  // Log tool call summary
  console.log("\n========== [Assets Search] Tool Calls Summary ==========");
  console.log("Tool Call Logs:", JSON.stringify(assetsSearchResult.value.toolCallLogs, null, 2));
  console.log("=========================================================\n");

  // Step 12: Assets Process Tags
  const assetsResult = await assetsProcessTagsStep({
    contentWithProcessedAssets: assetsSearchResult.value.contentWithProcessedAssets,
    outputFormat: input.internalUsage ? "html" : "markdown",
  });
  diagnostics.push({
    phase: "assets-process-tags",
    durationMs: assetsResult.durationMs,
  });

  const finalContent = assetsResult.value;

  // Step 12.5 (Optional): Pick Banner using AI (only if internalUsage is true)
  let bannerPickerResult = null;
  if (input.internalUsage) {
    try {
      const { bannerPickerStep } = await import("./steps/bannerPicker");
      bannerPickerResult = await bannerPickerStep({
        title: draftResult.value.metaTitle || "Untitled",
      });
      diagnostics.push({
        phase: "banner-picker",
        durationMs: bannerPickerResult.durationMs,
      });
    } catch (error) {
      console.error("[Workflow] Failed to pick banner:", error);
      diagnostics.push({
        phase: "banner-picker",
        durationMs: 0,
      });
    }
  }

  // Step 13 (Optional): Publish to WordPress (only if internalUsage is true)
  let publishResult = null;
  if (input.internalUsage) {
    try {
      publishResult = await publishToWordPressStep({
        content: finalContent,
        title: draftResult.value.metaTitle || "Untitled",
        slug: keywordToUse.toLowerCase().replace(/\s+/g, "-"),
        metaDescription: draftResult.value.metaDescription || "",
        excerpt: draftResult.value.excerpt || "",
        categoryId: 0, // Will be determined by formatter based on title
        bannerId: bannerPickerResult?.value.bannerId || 0,
        faqs: draftResult.value.faqs || [],
        tags: draftResult.value.tags || [],
      });
      diagnostics.push({
        phase: "publish-to-wordpress",
        durationMs: publishResult.durationMs,
      });
    } catch (error) {
      console.error("[Workflow] Failed to publish to WordPress:", error);

      diagnostics.push({
        phase: "publish-to-wordpress",
        durationMs: 0,
      });
    }
  }

  console.log(
    `\n========== [workflow] phase=complete status=done ==========\n`,
    { diagnostics }
  );

  return {
    content: finalContent,
    title: draftResult.value.metaTitle || "Untitled",
    slug: keywordToUse.toLowerCase().replace(/\s+/g, "-"),
    metaDescription: draftResult.value.metaDescription || "",
    excerpt: draftResult.value.excerpt || "",
    categoryId: publishResult?.value.categoryId || 0,
    bannerId: publishResult?.value.bannerId || 0,
    faqs: draftResult.value.faqs || [],
    tags: draftResult.value.tags || [],
    text: finalContent,
    liveBlogURL: publishResult?.value.postUrl || "",
    metadata: metadataResult.value,
    companyProfile: companyProfileResult.value,
    diagnostics,
    keywordUsed: keywordToUse,
    publishedToWordPress: !!publishResult?.value.success,
    wordPressPostId: publishResult?.value.postId,
  };
}
