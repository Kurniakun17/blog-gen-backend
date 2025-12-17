import { fetch as workflowFetch } from "workflow";
import type {
  GenerateBlogInput,
  PipelineDiagnostics,
} from "./types";
import { metadataStep } from "./steps/data/metadata";
import { companyProfileStep } from "./steps/data/companyProfile";
import { researchStep } from "./steps/data/research";
import { youtubeStep } from "./steps/data/youtube";
import { youtubeTranscriptStep } from "./steps/data/youtubeTranscript";
import { generateOutlineStep } from "./steps/writer/generateOutline";
import { writeFirstDraftStep } from "./steps/writer/writeFirstDraft";
import {
  gatherResearchUrlsStep,
  scrapeResearchUrlsStep,
} from "./steps/writer/verifyContext";
import { outlineVerifiedStep } from "./steps/writer/outlineVerified";
import { metaTextSplitterStep } from "./steps/writer/metaTextSplitter";
import { mergeResearchContext } from "./utils/context";
import type { MetadataResult } from "@/lib/metadata";
import type { CompanyProfile } from "@/lib/company";

export type GenerateBlogPreviewResponse = {
  content: string;
  title: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  tags: string[];
  metadata: MetadataResult;
  companyProfile?: CompanyProfile;
  diagnostics: PipelineDiagnostics;
  keywordUsed: string;
  outline: string;
};

export async function generateBlogPreviewWorkflow(
  input: GenerateBlogInput
): Promise<GenerateBlogPreviewResponse> {
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

  // Step 3.5: Fetch YouTube transcripts for outline context
  let youtubeTranscriptsResult = null;
  if (youtubeResult.value.videoUrls.length > 0) {
    youtubeTranscriptsResult = await youtubeTranscriptStep({
      youtubeUrls: youtubeResult.value.videoUrls,
      maxTranscripts: 3,
    });
    diagnostics.push({
      phase: "youtube-transcript",
      durationMs: youtubeTranscriptsResult.durationMs,
    });
  }

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
    youtubeTranscripts: youtubeTranscriptsResult?.value.formattedTranscripts,
  });
  diagnostics.push({
    phase: "generate-outline",
    durationMs: outlineResult.durationMs,
  });

  // Step 5.1a: Gather comprehensive research URLs from outline
  const gatherUrlsResult = await gatherResearchUrlsStep({
    outline: outlineResult.value.outline,
  });
  diagnostics.push({
    phase: "gather-research-urls",
    durationMs: gatherUrlsResult.durationMs,
  });

  // Step 5.1b: Scrape all research URLs
  const verifyContextResult = await scrapeResearchUrlsStep({
    toolsWithUrls: gatherUrlsResult.value.toolsWithUrls,
  });
  diagnostics.push({
    phase: "scrape-research-urls",
    durationMs: verifyContextResult.durationMs,
  });

  // Step 5.2: Outline Verified - Refine outline with verified data
  const outlineVerifiedResult = await outlineVerifiedStep({
    outline: outlineResult.value.outline,
    keyword: keywordToUse,
    verifiedContext: verifyContextResult.value.fullContext,
    researchContext: researchWithContext,
    companyContext: companyProfileResult.value.company_profile,
    blogType: metadataResult.value.blogType || "overview",
    companyName: companyProfileResult.value.company_name || "",
  });
  diagnostics.push({
    phase: "outline-verified",
    durationMs: outlineVerifiedResult.durationMs,
  });

  // Step 5.3: Meta Text Splitter - Split meta title, description, excerpt, tags from verified outline
  const metaTextResult = await metaTextSplitterStep({
    verifiedOutline: outlineVerifiedResult.value.verifiedOutline,
    slug: metadataResult.value.slug,
    topic: input.topic,
  });
  diagnostics.push({
    phase: "meta-text-splitter",
    durationMs: metaTextResult.durationMs,
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

  console.log(
    `\n========== [workflow-preview] phase=complete status=done ==========\n`,
    { diagnostics }
  );

  // Return preview with first draft (no polish, linking, assets, or publishing)
  return {
    content: firstDraftResult.value.result,
    title: metaTextResult.value.metaTitle,
    slug: metaTextResult.value.slug,
    metaDescription: metaTextResult.value.metaDescription,
    excerpt: metaTextResult.value.excerpt || "",
    tags: metaTextResult.value.tags,
    metadata: metadataResult.value,
    companyProfile: companyProfileResult.value,
    diagnostics,
    keywordUsed: keywordToUse,
    outline: outlineVerifiedResult.value.verifiedOutline,
  };
}
