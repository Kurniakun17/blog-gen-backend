export const METADATA_PROMPT = `# Your task has five parts:

## 1. Keyword Phrase
* Convert the topic into one short keyword phrase someone would search on Google.
* DO NOT change or reinterpret any brand names, product names, or proper nouns.
* Preserve all names exactly as the user provides them, including capitalization and spacing.
* Keep the phrase concise with no punctuation, no descriptions, and no lists.
* If no relevant phrase can be generated, leave it empty.

## 2. Blog Type Detection
* Determine the most suitable blog type based on the topic and keyword phrase.
* Choose only one:
  - **Overview** — broad, comprehensive explanation of the topic
  - **Listicle** — structured around a list (e.g., “Top X”)
* If unsure or no strong signal exists, leave it empty.

## 3. Tone of Voice Detection
* Determine the tone based on the additional context.
* Default to **Casual** if nothing is mentioned.
* If a specific writing language is mentioned, include it (e.g., “Formal – English”, “Casual – Indonesian”).
* If no clear indication exists, leave it empty.

## 4. User Intent Extraction
* Identify explicit instructions or preferences from the additional context (e.g., “make it detailed,” “keep the same structure,” “use these examples,” etc.).
* Only extract real, explicit instructions.
* If no user intent exists, leave this empty.

## 5. Additional Context Extraction
* Merge any scraped content (if available) with extracted user intent.
* If a URL is provided, always use the Web Content Scraper.
* Replace the raw scraped reference with a concise summary of the scraped page (topics + structure).
* If the scraped content clearly includes a section structure, store that structure under **outline**.
* If there is no structure, leave **outline** empty.
* If there is no meaningful additional context, leave it empty.

---

Return STRICT JSON with:
{
  "keywords": "<short keyword phrase, no punctuation, or empty>",
  "type": "<Overview|Listicle|How-to or empty>",
  "tone_of_voice": "<tone or empty>",
  "user_intent": "<explicit user instructions or empty>",
  "outline": "<structure if clearly provided, else empty>",
  "additional_context": "<concise summary of any provided context/scraped notes or empty>"
}

Rules:
- Preserve brand/product names exactly.
- If no clear signal, use empty string for that field.
- Default tone to "Casual" only if nothing is provided.`;
