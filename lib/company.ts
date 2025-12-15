import { z } from "zod";
import {
  COMPANY_PROFILE_PROMPT,
  INTERNAL_COMPANY_CONTEXT,
} from "@/prompts/company";
import { cleanLLMJson } from "./utils";
import { jsonrepair } from "jsonrepair";

export type CompanyProfile = {
  company_name?: string;
  company_profile: string;
  relevant_urls?: Array<{
    title: string;
    link: string;
    snippet: string;
    category: string;
  }>;
  source: "internal" | "ai";
};

export const companyProfileSchema = z.object({
  company_name: z.string().optional(),
  company_profile: z.string().min(10),
  relevant_urls: z
    .array(
      z.object({
        title: z.string(),
        link: z.string(),
        snippet: z.string(),
        category: z.string(),
      })
    )
    .optional(),
});

type FetchCompanyProfileInput = {
  companyUrl?: string;
  existingContext?: string;
  internalUsage?: boolean;
};

const COMPANY_PROFILE_MODEL_PRIMARY = "gpt-5-search-api";

/**
 * Call OpenAI Chat API with robust error handling
 *
 * Features:
 * - Automatic retry with exponential backoff (3 attempts by default)
 * - Conditionally uses JSON mode for non-search models (search models don't support it)
 * - Handles both string and array-of-parts response formats
 *
 * @param model - Model to use (e.g., "gpt-5-search-api")
 * @param system - System prompt
 * @param prompt - User prompt
 * @param retries - Number of retry attempts (default: 3)
 * @returns The response text from the model
 */
async function callOpenAIChat(
  model: string,
  system: string,
  prompt: string,
  retries = 3
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  let lastError: Error | null = null;

  // Search models (e.g., gpt-5-search-api) don't support response_format
  const isSearchModel = model.includes("search");

  if (isSearchModel) {
    console.log(`[callOpenAIChat] Using search model "${model}" - JSON mode disabled`);
  } else {
    console.log(`[callOpenAIChat] Using model "${model}" - JSON mode enabled`);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const requestBody: any = {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      };

      // Only add response_format for non-search models
      if (!isSearchModel) {
        requestBody.response_format = { type: "json_object" };
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI chat error (${response.status}): ${errorText.slice(0, 500)}`
        );
      }

      type ChatChoice = {
        message?: { content?: string | Array<{ text?: string }> };
      };
      type ChatResponse = { choices?: ChatChoice[] };

      const data = (await response.json()) as ChatResponse;
      const rawContent = data?.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("OpenAI chat response missing message content");
      }

      if (typeof rawContent === "string") {
        return rawContent;
      }

      // Handle array-of-parts structure
      const combined = rawContent
        .map((part) => {
          if (typeof part === "string") return part;
          return part?.text ?? "";
        })
        .join("")
        .trim();

      if (!combined) {
        throw new Error("OpenAI chat response contained no text content");
      }

      return combined;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(
          `[callOpenAIChat] Attempt ${attempt + 1}/${retries} failed, retrying in ${backoffMs}ms...`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

export async function fetchCompanyProfile(
  input: FetchCompanyProfileInput
): Promise<CompanyProfile> {
  if (input.internalUsage) {
    return {
      company_name: "eesel AI",
      company_profile: INTERNAL_COMPANY_CONTEXT,
      relevant_urls: undefined,
      source: "internal",
    };
  }

  if (!input.companyUrl && !input.existingContext) {
    return {
      company_profile: "No company URL or context provided.",
      relevant_urls: [],
      source: "ai",
    };
  }

  let companyProfile: z.infer<typeof companyProfileSchema> = {
    company_profile: input.existingContext || "Company profile unavailable.",
    relevant_urls: [],
  };

  let COMPANY_PROFILE_USER_PROMPT = `# Input Data Company URL: ${
    input.companyUrl || "n/a"
  }`;

  try {
    const primaryText = await callOpenAIChat(
      COMPANY_PROFILE_MODEL_PRIMARY,
      COMPANY_PROFILE_PROMPT,
      COMPANY_PROFILE_USER_PROMPT
    );

    console.log("[company_profile] primary raw", primaryText);

    // Multi-strategy JSON parsing to handle LLM inconsistencies
    // Strategy 1: Standard JSON.parse
    // Strategy 2: jsonrepair library to fix common JSON errors (missing commas, quotes, etc.)
    let cleaned: any;
    const cleanedText = cleanLLMJson(primaryText);

    try {
      // Strategy 1: Standard JSON.parse
      cleaned = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn(
        "[company_profile] Standard JSON.parse failed, attempting repair...",
        parseError instanceof Error ? parseError.message : String(parseError)
      );

      try {
        // Strategy 2: Use jsonrepair to fix malformed JSON
        const repairedJson = jsonrepair(cleanedText);
        cleaned = JSON.parse(repairedJson);
        console.log("[company_profile] Successfully repaired JSON");
      } catch (repairError) {
        console.error(
          "[company_profile] JSON repair failed:",
          repairError instanceof Error ? repairError.message : String(repairError)
        );
        console.error("[company_profile] Problematic JSON:", cleanedText.substring(0, 1000));
        throw new Error(
          `Failed to parse JSON even after repair: ${
            repairError instanceof Error ? repairError.message : String(repairError)
          }`
        );
      }
    }

    // Handle legacy/new field names from the prompt output
    if (!cleaned.company_profile && typeof cleaned.company_context === "string") {
      cleaned.company_profile = cleaned.company_context;
    }

    const parsed = companyProfileSchema.parse(cleaned);
    companyProfile = parsed;
    console.log("[company_profile] Successfully parsed company profile");
  } catch (primaryError) {
    console.warn(
      `[CompanyProfile] Primary model ${COMPANY_PROFILE_MODEL_PRIMARY} failed, falling back.`,
      primaryError
    );
  }

  try {
    return {
      ...companyProfile,
      source: "ai",
    };
  } catch (error) {
    console.warn("[CompanyProfile] Failed to parse company profile", error);
    return {
      ...companyProfile,
      company_profile: input.existingContext || "Company profile unavailable.",
      source: "ai",
    };
  }
}
