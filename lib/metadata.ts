import { generateObject } from "ai";
import { z } from "zod";
import { METADATA_PROMPT } from "@/prompts/metadata/metadata";
import { getModel } from "../config/models";

export type MetadataResult = {
  keyword: string;
  blogType: "overview" | "listicle" | "how-to" | "";
  tone: string;
  userIntent: string;
  outline: string;
  additionalContext: string;
  slug: string;
  raw: Record<string, unknown>;
};

export const metadataSchema = z.object({
  keywords: z.string().optional(),
  type: z.string().optional(),
  tone_of_voice: z.string().optional(),
  outline: z.string().optional(),
  additional_context: z.string().optional(),
  user_intent: z.string().optional(),
});

function slugifyKeyword(keyword: string): string {
  const base = keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const slugWithLocale = base.endsWith("-en") ? base : `${base}-en`;
  return slugWithLocale;
}

function normalizeBlogType(type?: string): MetadataResult["blogType"] {
  if (!type) return "";
  const value = type.toLowerCase();
  if (value.includes("list")) return "listicle";
  if (value.includes("how")) return "how-to";
  if (value.includes("overview")) return "overview";
  return "";
}

type DeriveMetadataInput = {
  topic: string;
  additionalContext?: string;
};

export async function deriveMetadata(
  input: DeriveMetadataInput
): Promise<MetadataResult> {
  const topicStr = input.topic?.trim();
  const additionalContextStr = input.additionalContext?.trim();

  const prompt = [
    METADATA_PROMPT,
    "",
    `Topic: ${topicStr}`,
    `Additional Context: ${additionalContextStr || "null"}`,
  ].join("\n");

  const result = await generateObject({
    model: getModel("research"),
    system:
      "You are a precise metadata extractor. Follow the JSON shape exactly.",
    schema: metadataSchema,
    prompt,
  });

  const parsed = result.object;

  const keyword = parsed.keywords?.trim() || topicStr || "";
  const tone = parsed.tone_of_voice?.trim() || "Casual";
  const blogType = normalizeBlogType(parsed.type);
  const userIntent = parsed.user_intent?.trim() || "";
  const outline = parsed.outline?.trim() || "";
  const additionalContext = parsed.additional_context?.trim() || "";
  const slug = slugifyKeyword(keyword || "blog-post");

  return {
    keyword,
    blogType,
    tone,
    userIntent,
    outline,
    additionalContext,
    slug,
    raw: parsed,
  };
}
