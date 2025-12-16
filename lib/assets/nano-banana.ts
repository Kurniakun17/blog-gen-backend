/**
 * Nano-Banana Asset Generation
 * Generates visual assets (infographics, workflow diagrams) using Gemini AI
 */

import { randomUUID } from "crypto";
import type { NanoBananaResult } from "./types";

/**
 * Generate visual assets using Gemini AI and upload to Supabase
 * @param assetDescription - The full description from the <assets> block
 * @returns Result with URL and title, or null if generation fails
 */
export async function generateNanoBananaAsset(
  assetDescription: string
): Promise<NanoBananaResult | null> {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!geminiApiKey || !supabaseUrl || !supabaseAnonKey) {
      console.warn("[Nano-Banana] Missing API keys, skipping generation");
      return null;
    }

    // Generate UUID for unique file naming
    const uuid = randomUUID();

    // Build the detailed prompt for asset generation
    const prompt = buildNanoBananaPrompt(assetDescription);

    // Step 1: Call Gemini API to generate image
    console.log("[Nano-Banana] Calling Gemini API to generate asset...");
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error(
        "[Nano-Banana] Gemini API error:",
        await geminiResponse.text()
      );
      return null;
    }

    const geminiData = await geminiResponse.json();

    // Step 2: Extract image data from response
    const imageBase64 = extractImageFromGeminiResponse(geminiData);

    if (!imageBase64) {
      console.error("[Nano-Banana] No image data in Gemini response");
      return null;
    }

    // Step 3: Convert base64 to binary
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Step 4: Upload to Supabase Storage
    console.log("[Nano-Banana] Uploading to Supabase Storage...");
    const uploadUrl = `${supabaseUrl}/storage/v1/object/public_assets/blog-gen/${uuid}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      console.error(
        "[Nano-Banana] Supabase upload error:",
        await uploadResponse.text()
      );
      return null;
    }

    // Step 5: Generate public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/public_assets/blog-gen/${uuid}`;

    // Extract title from description (first few words)
    const title = extractTitleFromDescription(assetDescription);

    console.log("[Nano-Banana] Asset generated successfully:", publicUrl);

    return {
      url: publicUrl,
      title,
    };
  } catch (error) {
    console.error("[Nano-Banana] Generation failed:", error);
    return null;
  }
}

/**
 * Build the detailed prompt for Gemini AI asset generation
 */
function buildNanoBananaPrompt(assetDescription: string): string {
  return `You are an asset designer tasked with creating an asset for a blog. You will be given a few inputs that will detail exactly the kind of asset you should make.

<important_style_guide>
• Colour Palette:
  - Primary: Purple (#6F2DBD, #A663CC, #B298DC)
  - Secondary: Soft charcoal (#1E1E24), Off-white (#F7F7FA)
  - Accent: Electric blue (#4F9DFF) and subtle neon lavender (#CDB5FF)
  - Use gradients sparingly (subtle linear fade only). Avoid heavy shadows.

• Typography:
  - Font family must be Arial (or high-legibility neo-grotesk fallback).
  - Headings: Bold, high contrast, wide spacing.
  - Body text: Clear, readable, no condensed or narrow variants.
  - Text must have extremely high contrast against background.
  - Avoid decorative fonts entirely.

• Layout & Spacing:
  - Use generous padding around each section.
  - Maintain a clean grid with clear alignment.
  - Keep whitespace intentional and balanced.
  - No clutter. No overlapping shapes.

• Shape Language:
  - Use soft rounded rectangles, subtle lines, smooth circles.
  - Avoid skeuomorphic shading or excessive 3D depth.
  - Avoid "Web 2.0 glassy bubbles", glossy badges, or heavy drop shadows.

• Iconography:
  - Only simple, hand-drawn line icons.
  - Icon stroke weight must be uniform.
  - No gradients, no photo-textures, no 3D renderings.
  - Icons must feel modern, minimal, and tech-friendly.

• Overall Aesthetic:
  - Minimalist tech-infographic style.
  - Light, spacious layout.
  - Modern, crisp, and polished.
  - Everything must be rendered in 4K clarity.
</important_style_guide>

Here are types of assets you can make:

Infographics:
- A horizontal style infographic card in 16:9 ratio.
- At the top of the card, feature a bold, eye catching title in large writing using contrasting colours.
- The layout should be divided into 2 to 4 clear sections.
- Each section expresses a core idea with brief and concise info.
- The font should retain a smooth rhythmic flow, remaining legible while carrying a small measure of artistic appeal.
- The card should include simple, hand-drawn icons, such as symbols related to the key topic. This should enhance the visual interest and spark reader reflection.
- The overall layout should maintain visual balance, ensure clarity, simplicity, and ease of reading and understanding.

Mermaid flows / WorkflowV2:
- A horizontal style chart. It must always be 16:9.
- At the top of the card, feature a bold, eye catching title using contrasting colours.
- The layout should have some clearly defined workflow that matches the given input, clearly displayed.
- Each step in the workflow or node should have a core idea with brief and concise info.
- The font should retain a smooth rhythmic flow.
- The chart should include simple, hand-drawn icons, such as symbols related to the key topic. This should enhance the visual interest and spark reader reflection.
- The overall layout should maintain visual balance, ensure clarity, simplicity, and ease of reading and understanding.
- There should always be some simple framing or interesting features to help the mermaid chart feel professional.
- No background images or images in the frame.

Here are your inputs:

* Main colours: **purple**
* Font type: **Arial**
* Asset description:

${assetDescription}

Other things to remember:

* The colours are a guideline.
* You should aim to make the asset look full and detailed.
* Colours and styling must contain consistent throughout.
* "no skeuomorphic icons"
* "avoid Web 2.0 style graphics"
* "avoid early 2010s corporate infographic style"

Instead you should make it:
"minimalist tech infographic"
"light, spacious layout"

Text MUST BE extremely clear and legible – the highest resolution possible.

Create an asset that matches the inputs and the types of asset.
The overall output should be modern, sleek, it should POP, and feel very polished.
It must be 4k resolution.`;
}

/**
 * Extract image data from Gemini API response
 */
function extractImageFromGeminiResponse(geminiData: any): string | null {
  let imageBase64: string | null = null;
  const candidates = geminiData.candidates || [];

  for (const candidate of candidates) {
    if (!candidate.content?.parts) continue;

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }
    if (imageBase64) break;
  }

  return imageBase64;
}

/**
 * Extract a short title from the asset description
 */
function extractTitleFromDescription(description: string): string {
  const title = description
    .split("–")[0]
    .replace(/Asset \d+:\s*/i, "")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");

  return title || "Generated Asset";
}
