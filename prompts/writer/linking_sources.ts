export const EESEL_PRODUCT_LINKS = {
  "AI Agent": "https://www.eesel.ai/product/ai-agent",
  "AI Copilot": "https://www.eesel.ai/product/ai-copilot",
  "AI Triage": "https://www.eesel.ai/product/ai-triage",
  "AI Chatbot": "https://www.eesel.ai/product/ai-chatbot",
  "AI Internal Chat": "https://www.eesel.ai/product/ai-internal-chat",
  "AI Email Writer": "https://www.eesel.ai/product/ai-email-writer",
};

export const buildLinkingSourcesPrompt = ({
  blogInput,
  blogType,
  internalLinks,
  externalUrls,
  internalUsage,
  verifiedSources,
}: {
  blogInput: string;
  blogType: string;
  internalLinks: string[];
  externalUrls: string[];
  internalUsage?: boolean;
  verifiedSources?: string[];
}): string => {
  // Build internal links section
  const internalLinksSection = internalLinks.length > 0
    ? internalLinks.map((link, index) => `${index + 1}. ${link}`).join("\n")
    : "No internal links provided.";

  // Build external URLs section
  const externalUrlsSection = externalUrls.length > 0
    ? externalUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")
    : "No external URLs provided.";

  // Build verified sources section
  const verifiedSourcesSection = verifiedSources && verifiedSources.length > 0
    ? verifiedSources.map((url, index) => `${index + 1}. ${url}`).join("\n")
    : "No verified sources from context verification.";

  // Add eesel AI product links section only for internal usage
  const eeselProductLinksSection = internalUsage
    ? `

When the blog explicitly mentions the following products, link them to their official product pages (if not already linked):

${Object.entries(EESEL_PRODUCT_LINKS)
  .map(([product, url]) => `- ${product} – ${url}`)
  .join("\n")}

Use the **most descriptive natural phrase** as anchor text when possible.`
    : "";

  return `Your role is to review a blog's content and embed relevant INTERNAL and EXTERNAL links into the existing text.

You are NOT allowed to alter, edit, rewrite, summarize, or restructure the blog in any way.
Your ONLY permitted action is to embed links into existing anchor text where appropriate.

The final blog must be EXACTLY the same as the original input, with the ONLY difference being added links.

------------------------------------------------------------
GENERAL RULES (APPLY TO ALL LINKING)
------------------------------------------------------------
- NEVER change an existing link.
- NEVER remove an existing link.
- ONLY add links where none exist.
- PRESERVE all verified context source links that are already in the content.
- NEVER add links to headings (except where explicitly overridden below).
- NEVER add links to FAQ QUESTIONS — links are allowed ONLY in FAQ ANSWERS.
- NEVER suggest placeholder images, .pngs, mermaid flows, or any assets.
- Stick strictly to inline text and URLs provided.
- Do NOT fabricate sources or make assumptions.
- Avoid clutter: do NOT add too many links in a single paragraph.
- Anchor text must be natural and concise (NO MORE THAN 5 WORDS).

------------------------------------------------------------
PART 1 — INTERNAL LINKING
------------------------------------------------------------
Your task is to improve the internal linking structure of the blog using ONLY the list of internal links provided.

Goals:
- Improve SEO and navigation.
- Guide readers to genuinely relevant internal content.
- Support related topics without forcing links.

Rules:
1. Only add internal links when they are directly relevant to the sentence.
2. Use each internal link ONLY ONCE.
3. Do NOT add internal links to headings.
4. Do NOT add internal links to FAQ questions — answers only.
5. Anchor text should be short, clear, and descriptive.
6. Do NOT overload a paragraph with internal links.

Linking examples:
- "Confluence AI pricing" → link to Confluence pricing guide
- "Intercom Fin Copilot" → link to Intercom Fin setup guide
- "Zendesk AI automation" → link to Zendesk AI automation breakdown${eeselProductLinksSection}

If no relevant internal link exists for a sentence or section, DO NOTHING.

------------------------------------------------------------
PART 2 — VERIFIED CONTEXT SOURCES (HIGHEST PRIORITY)
------------------------------------------------------------
The following URLs are from the context verification step and have been used to verify claims in the outline.

CRITICAL RULES:
- ALWAYS preserve these verified source links if they already exist in the content.
- These links were added during the outline verification stage and MUST NOT be removed or modified.
- If any verified claims in the content reference these sources, keep those links intact.

Verified Sources:
${verifiedSourcesSection}

------------------------------------------------------------
PART 3 — EXTERNAL LINKING
------------------------------------------------------------
Your task is to strengthen credibility and SEO by embedding relevant external citations from the provided source blogs.

You must:
- Carefully read and understand the source URLs.
- Match claims, data, pricing, features, limitations, or setup complexity in the blog to supporting sources.
- Embed links using markdown format (not HTML).
- Use each external URL ONLY ONCE.
- Use short, natural anchor text (≤ 5 words).
- Do NOT add links to headings (unless overridden below).
- Do NOT add links to FAQ questions — answers only.
- NEVER add links that are not in the provided URL lists.

When the blog includes:
- Pricing numbers
- Feature comparisons
- Product limitations
- Setup complexity
- Industry statistics

And a matching source exists → you MUST link it (unless already used).

Examples:
- "According to McKinsey" → link to McKinsey source
- "AI adoption has more than doubled" → link that phrase to Gartner or equivalent
- "Harvard Business Review notes…" → link HBR article

------------------------------------------------------------
LISTICLE OVERRIDE RULE (CRITICAL)
------------------------------------------------------------
If the blog type is **Listicle**, the following rule OVERRIDES all others:

- EVERY alternative product mentioned in a HEADING MUST be linked in the heading itself.
- Format example:
  ### 2. [Yuma AI](https://yuma.ai/)
- You are ALLOWED to search for the official landing page if needed.
- NEVER skip this rule.
- This applies ONLY to listicle headings.

------------------------------------------------------------
INPUTS
------------------------------------------------------------

Here is the blog you are adding links to:

<blog_input>
${blogInput}
</blog_input>

Here is the blog type:

<blog_type>
${blogType}
</blog_type>

Here is the list of INTERNAL links you may use:

<internal_links>
${internalLinksSection}
</internal_links>

Here is the list of EXTERNAL URLs you may use:

<external_urls>
${externalUrlsSection}
</external_urls>

------------------------------------------------------------
OUTPUT INSTRUCTIONS
------------------------------------------------------------

Return the EXACT same blog content with ONLY the links added. Do not change any other text, formatting, or structure.`;
};
