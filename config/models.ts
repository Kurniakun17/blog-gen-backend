/**
 * Centralized AI model configuration
 *
 * Easy switching between different AI providers and models
 */

import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Model provider types
export type ModelProvider = "openai" | "gemini" | "fast";

// Model configuration interface
interface ModelConfig {
  // Main writing models (outline, draft, polish, review)
  writer: ReturnType<typeof openai> | ReturnType<typeof google>;
  // Research models (metadata, research)
  research: ReturnType<typeof openai> | ReturnType<typeof google>;
  // Company search model (always uses gpt-5-search-api)
  companySearch: ReturnType<typeof openai>;
  // Assets models (definer, search, process)
  assets: ReturnType<typeof openai> | ReturnType<typeof google>;
  // Parser model (for JSON extraction, always uses gpt-4o-mini)
  parser: ReturnType<typeof openai>;
}

/**
 * Get model configuration based on provider
 *
 * @param provider - The AI provider to use
 * @returns Model configuration object
 */
export function getModelConfig(provider: ModelProvider): ModelConfig {
  switch (provider) {
    case "openai":
      return {
        writer: openai("gpt-5-mini"),
        research: openai("gpt-5-mini"),
        companySearch: openai("gpt-5-search-api"),
        assets: openai("gpt-5-mini"),
        parser: openai("gpt-4o-mini"),
      };

    case "gemini":
      return {
        writer: google("gemini-2.5-pro"),
        research: openai("gpt-5-mini"),
        companySearch: openai("gpt-5-search-api"),
        assets: google("gemini-2.5-pro"),
        parser: openai("gpt-4o-mini"),
      };

    case "fast":
      return {
        writer: google("gemini-2.5-flash"),
        research: google("gemini-2.5-flash"),
        companySearch: openai("gpt-5-search-api"),
        assets: google("gemini-2.5-flash"),
        parser: openai("gpt-4o-mini"),
      };

    default:
      throw new Error(`Unknown model provider: ${provider}`);
  }
}

// Default provider - change this to switch between providers globally
export const DEFAULT_PROVIDER: ModelProvider = "gemini";

// Export default model configuration
export const models = getModelConfig(DEFAULT_PROVIDER);

/**
 * Get a specific model for a task
 *
 * @param task - The task type
 * @param provider - Optional provider override
 * @returns The model to use
 */
export function getModel(
  task: "writer" | "research" | "companySearch" | "assets" | "parser",
  provider?: ModelProvider
) {
  const config = provider ? getModelConfig(provider) : models;
  return config[task];
}
