/**
 * Utility functions for handling LLM responses and JSON parsing
 */

/**
 * Clean markdown code block wrappers from LLM-generated JSON strings
 * 
 * Handles various formats:
 * - ```json\n{...}\n```
 * - ```\n{...}\n```
 * - Plain JSON without wrappers
 * 
 * @param jsonString - Raw string from LLM that may contain markdown code blocks
 * @returns Cleaned JSON string ready for parsing
 * 
 * @example
 * ```typescript
 * const raw = '```json\n{"key": "value"}\n```';
 * const cleaned = cleanLLMJson(raw);
 * // Returns: '{"key": "value"}'
 * ```
 */
export function cleanLLMJson(jsonString: string): string {
  let cleanedString = jsonString.trim();

  // Remove ```json and ``` markers
  if (cleanedString.startsWith('```json')) {
    cleanedString = cleanedString
      .replace(/^```json\s*\n?/, '')
      .replace(/\n?```\s*$/, '');
  } else if (cleanedString.startsWith('```')) {
    cleanedString = cleanedString
      .replace(/^```\s*\n?/, '')
      .replace(/\n?```\s*$/, '');
  }

  return cleanedString.trim();
}

/**
 * Clean and parse LLM-generated JSON in one step
 * 
 * @param jsonString - Raw string from LLM that may contain markdown code blocks
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails after cleaning
 * 
 * @example
 * ```typescript
 * const raw = '```json\n{"results": [1, 2, 3]}\n```';
 * const parsed = parseLLMJson<{results: number[]}>(raw);
 * // Returns: { results: [1, 2, 3] }
 * ```
 */
export function parseLLMJson<T = unknown>(jsonString: string): T {
  const cleaned = cleanLLMJson(jsonString);
  return JSON.parse(cleaned) as T;
}

/**
 * Parse LLM JSON and extract the "results" array
 * 
 * This matches the pattern from n8n Code9 node where LLM responses
 * often wrap data in a "results" property.
 * 
 * @param jsonString - Raw JSON string from LLM
 * @returns Array from the "results" property, or error object if parsing fails
 * 
 * @example
 * ```typescript
 * const raw = '```json\n{"results": [{"id": 1}, {"id": 2}]}\n```';
 * const tools = parseAndExtractResults(raw);
 * // Returns: [{"id": 1}, {"id": 2}]
 * ```
 */
export function parseAndExtractResults<T = unknown>(jsonString: string): T[] {
  try {
    const cleaned = cleanLLMJson(jsonString);
    const data = JSON.parse(cleaned);

    // Extract the array from the "results" key
    const resultsArray = data.results;
    if (!Array.isArray(resultsArray)) {
      throw new Error("Parsed JSON does not contain an array at the 'results' property.");
    }

    return resultsArray as T[];
  } catch (error) {
    console.error('Critical Parsing Error:', error instanceof Error ? error.message : error);
    return [
      {
        error: 'Failed to parse the input JSON string.',
        details: error instanceof Error ? error.message : String(error),
      } as T,
    ];
  }
}

/**
 * Extract and parse JSON content from LLM message objects
 * 
 * This matches the pattern from n8n Code11 node where messages have
 * a nested structure like { message: { content: "..." } }
 * 
 * @param messages - Array of message objects with content property
 * @returns Flattened array of parsed results
 * 
 * @example
 * ```typescript
 * const messages = [
 *   { message: { content: '```json\n{"results": [1, 2]}\n```' } },
 *   { message: { content: '```json\n{"results": [3, 4]}\n```' } }
 * ];
 * const results = extractResultsFromMessages(messages);
 * // Returns: [1, 2, 3, 4]
 * ```
 */
export function extractResultsFromMessages<T = unknown>(
  messages: Array<{ message?: { content?: string } }>
): T[] {
  const results: T[] = [];

  for (const item of messages) {
    // Get the content from message.content
    if (item.message && item.message.content) {
      const content = item.message.content;

      try {
        // Clean and parse JSON
        const cleaned = cleanLLMJson(content);
        const parsed = JSON.parse(cleaned);

        // If it has results array, add them
        if (parsed.results && Array.isArray(parsed.results)) {
          results.push(...(parsed.results as T[]));
        }
      } catch (e) {
        // If parsing fails, skip this item
        console.warn('Failed to parse message content, skipping:', e);
        continue;
      }
    }
  }

  return results;
}

/**
 * Strip FAQ sections from content
 *
 * Removes FAQ sections that start with:
 * - ## Frequently Asked Questions
 * - ## Frequently Asked Question
 * - ## FAQ
 * - ### Frequently Asked Questions
 * - ### Frequently Asked Question
 * - ### FAQ
 *
 * The function removes everything from the FAQ heading onwards.
 *
 * @param content - The content string that may contain FAQ sections
 * @returns Content with FAQ sections removed
 *
 * @example
 * ```typescript
 * const content = `# Blog Post\n\nSome content here.\n\n## FAQ\n\nQ: Question?\nA: Answer.`;
 * const cleaned = stripFAQSection(content);
 * // Returns: "# Blog Post\n\nSome content here."
 * ```
 */
export function stripFAQSection(content: string): string {
  // Pattern matches:
  // - ## or ### (2 or 3 hashtags)
  // - followed by optional whitespace
  // - followed by "FAQ" or "Frequently Asked Question" or "Frequently Asked Questions" (case-insensitive)
  // - captures everything from that heading onwards
  const faqPattern = /^#{2,3}\s+(FAQ|Frequently Asked Questions?)\s*$/im;

  const match = content.match(faqPattern);

  if (match && match.index !== undefined) {
    // Remove everything from the FAQ heading onwards
    return content.substring(0, match.index).trim();
  }

  return content;
}


