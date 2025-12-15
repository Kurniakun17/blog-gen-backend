import { z } from "zod";
import type { WordPressOutput } from "@/lib/formatter";
import type { MetadataResult } from "@/lib/metadata";
import type { CompanyProfile } from "@/lib/company";

// Zod schema for request validation
export const generateBlogSchema = z.object({
  keyword: z.string().optional(),
  topic: z.string().min(1, "Topic is required"),
  additional_context: z.string().optional(),
  company_url: z.string().optional(),
  internalUsage: z.boolean().optional()
});

export type GenerateBlogInput = z.infer<typeof generateBlogSchema>;

export type PipelineDiagnostics = Array<{ phase: string; durationMs: number }>;

export type GenerateBlogResponse = WordPressOutput & {
  metadata: MetadataResult;
  companyProfile?: CompanyProfile;
  diagnostics: PipelineDiagnostics;
  keywordUsed: string;
  publishedToWordPress?: boolean;
  metaDescription?: string;
  excerpt?: string;
  wordPressPostId?: number;
};
