export function buildAssetsDefinerPrompt(
  keyword: string,
  isInternalTeam: boolean,
  youtubeResults: string
): string {
  const priorityList = `${
    isInternalTeam
      ? "1. **Eesel Internal Assets** (WordPress predefined assets)\n"
      : ""
  }2. **WorkflowV2** (WordPress predefined workflows)\n3. **Screenshots** \n4. **Infographics**`;

  const eesselInternalSection = isInternalTeam
    ? `
## 1. Eesel Internal Assets
Insert these FIRST whenever the blog mentions:
- Eesel AI
- AI Copilot
- AI Agent
- AI Triage
- Blog generator
- Any eesel-owned feature

Placement:
- Insert the asset block **after the first paragraph** introducing the concept.
- If WorkflowV2 is also relevant → insert WorkflowV2 immediately after the internal asset.

Format inside "<assets>":
- type = "eesel_internal_asset"
- short description should reflect the exact feature

These assets come from **WordPress Media** and will be retrieved downstream.

---

`
    : "";

  return `# ASSETS DEFINER — Insert Asset Suggestions Into the Draft Blog

Your task is to analyze the entire blog inside \`<draft_blog>\` and insert visual asset suggestions **directly into the blog content**.

You must preserve the blog EXACTLY as written — wording, spacing, headings, formatting — except where infographics require a small contextual adjustment (only in the specific part that anchors the infographic).

Your output MUST return:
1. **The full draft blog**, unchanged except for inserted \`<assets> … </assets>\` blocks.
2. Asset blocks must follow this format:

<assets>
Asset 1: [type] – [short description]
Alt title: [text that includes the exact focus keyword]
Alt text: [text that includes the exact focus keyword]
</assets>

You MUST insert assets into correct locations using the mapping rules below.

---

# 🎯 PRIORITY ORDER FOR ASSET INSERTION
When multiple asset types apply, use this strict priority:

${priorityList}

HOWEVER - this priority is overruled by the VARIETY rule. The VARIETY rule means that you should try and use multiple different types of assets, and use screenshots where you can.

---

# 📌 MAPPING RULES FOR EACH ASSET TYPE
${eesselInternalSection}
## 2. WorkflowV2
Insert WorkflowV2 (WordPress) when:
- A section explains a process
- A step-by-step logic is described
- A workflow is described verbally

Placement:
- If an Eesel Internal Asset exists in that section → place WorkflowV2 immediately after that internal asset
- Otherwise → place it after the paragraph describing the steps

---

## 3. Screenshots
Screenshots MUST ALWAYS be inserted when:
- The blog mentions a product in a heading (e.g., “### 3. Zendesk”, “### 4. Tidio”)
- The blog is a listicle and introduces a tool
- A platform or product is being introduced for the first time, insert landing page (e.g. "What is Shopify Inbox?")
- Screenshots MUST NOT be inserted when:
  1. The screenshot would show features, dashboards, or internal pages
  2. Only landing pages are allowed because the screenshot tool can capture landing pages only
- Important Notes:
  1. Do not skip required screenshots.
  2. Do not insert screenshots in any other situation outside the rules above.
- Placement rule: **IF a numbered heading is introducing the product → insert the screenshot immediately AFTER that heading.**

Format inside "<assets>":
- type = \`screenshot\`
- short description must describe the screenshot context

---

## 4. Infographics
Infographics are ONLY used when the content explains:
- A complex concept
- A multi-step reasoning
- A comparison that benefits from visual clarity

Placement:
- Insert the infographic after the paragraph that provides conceptual context.

Special rule:
Infographics are the ONLY asset where you may slightly adjust wording in that paragraph to give the infographic a natural anchor.  
This change must be **minimal and strictly contextual**.
NEVER insert an infographic when blog mentions a product in a heading (e.g., “### 3. Zendesk”, “### 4. Tidio”).

Format inside "<assets>":
- type = \`infographic\`
- description must detail what the designer should illustrate

---

# 📌 ASSET INSERTION RULES (GLOBAL)

You must:
- NEVER place two \`<assets>\` blocks consecutively  
- ALWAYS ensure at least one full paragraph exists between assets  
- NEVER place assets inside headings or inside paragraphs  
- NEVER place assets inside a table
- NEVER place assets in the end of the whole blog (after conclusion)
- NEVER modify any existing tables  
- ALWAYS include the focus keyword in alt title + alt text  
- NEVER remove or rewrite existing content (again: ONLY infographics may slightly expand the contextual paragraph)
- NEVER use the same exact same asset more than once in the same blog.
- DO NOT insert any assets in between a bullet point list! 
---

# YOUTUBE INSERTION

## Pre-placed YouTube Videos (HIGHEST PRIORITY)
If the blog already contains \`[YOUTUBE_VIDEO: url]\` markers, these are PRE-PLACED by the outline generator with contextual backing paragraphs. You MUST:
1. Convert these markers into proper \`<assets>\` blocks
2. Keep them in their EXACT location (do not move them)
3. The contextual paragraph BEFORE the marker is the backing text - do NOT add another paragraph

Format for pre-placed markers:
\`\`\`
[YOUTUBE_VIDEO: https://www.youtube.com/watch?v=xxxxx]
\`\`\`

Convert to:
\`\`\`
<assets>
Asset 1: [YouTube] – [description based on context]
Alt title: [text that includes the exact focus keyword]
Alt text: [text that includes the exact focus keyword]
URL: https://www.youtube.com/watch?v=xxxxx
</assets>
\`\`\`

## Fallback YouTube Insertion (ONLY if no pre-placed markers exist)
If there are NO \`[YOUTUBE_VIDEO: url]\` markers in the blog, you MAY suggest a youtube video when its RELEVANT to the FOCUS KEYWORD.
The [type] of assets will be YouTube. You SHOULD also suggest an engaging alt title and alt text.
*   YouTube videos SHOULD BE placed in the middle or at the end of the blog. It must NEVER BE at the beginning.
*   When the blog is a LISTICLE, then any YouTube videos can ONLY be embedded AFTER the list, and BEFORE the conclusion. It must NEVER BE before the list.
*   You MUST write a contextual paragraph BEFORE the YouTube asset that introduces why this video is relevant.

Here's the YouTube search results (use for fallback only):
${youtubeResults}

---


# 📌 FOCUS KEYWORD
The alt title and alt text MUST contain the exact focus keyword:

\`${keyword}\`

---

# ✅ FINAL INSTRUCTIONS  
YOU ARE NOT TO EDIT THE TONE OR FORMATTING OR WRITING OF THE BLOG IN ANY WAY other than to ADD suggested asset descriptions.  
This is the most important command.  
Your output will be the SAME blog but with asset suggestions (except for infographics, which may require minimal contextual additions).`;
}
