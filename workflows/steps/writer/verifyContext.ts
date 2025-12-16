import { runStep, type TimedResult } from "../../utils/steps";
import { generateText } from "ai";
import { getModel } from "@/config/models";

type VerifyContextStepInput = {
  outline: string;
  keyword: string;
};

type VerificationQuestion = {
  claim: string;
  question: string;
  answer?: string;
  source?: string;
};

type VerifyContextResult = {
  questions: VerificationQuestion[];
  verifiedData: VerificationQuestion[];
};

type ClaimGroup = {
  claims: VerificationQuestion[];
  combinedQuestion: string;
  groupTopic: string;
};

/**
 * Step: Verify Context
 * Extracts sensitive claims from the outline and verifies them using SERP API Google AI Mode
 */
export async function verifyContextStep(
  input: VerifyContextStepInput
): Promise<TimedResult<VerifyContextResult>> {
  return runStep(
    "verify-context",
    {
      keyword: input.keyword,
    },
    async () => {
      "use step";

      console.log("\n========== [Verify Context] Starting ==========");
      console.log("Outline length:", input.outline.length);
      console.log("Keyword:", input.keyword);
      console.log("===============================================\n");

      // Step 1: Extract claims and generate verification questions
      const claimsExtractionPrompt = `You are an expert fact-checker. Analyze the following blog outline and identify all sensitive claims, statistics, facts, or statements that need verification.
This includes, but is not limited to:
1. Numerical data, statistics, benchmarks, or percentages
2. Pricing information or pricing tiers
3. Any stated strengths and limitations of a product or platform
4. Product or platform features
5. Market position, adoption, availability, or usage claims
CRITICAL: If the blog includes strengths and/or limitations of a product or platform, you must:
1. Identify each and every strength and limitation listed
2. Treat each one as a factual claim
3. Include them individually if they require verification
When multiple statements refer to the same underlying fact, feature set, policy, definition, or system behavior (example: pricing):
1. Group closely related details into a single claim whenever they can reasonably be verified together
2. Avoid generating repetitive or overlapping verification questions for the same concept
3. Generate one concise verification question that covers the grouped information
For each claim, generate a concise question that can be answered by a search engine to verify the information.Return your response as a JSON array with this structure:
Return your response as a JSON array with this structure:
[
  {
    "claim": "The exact claim from the outline",
    "question": "A concise question to verify this claim"
  }
]
Only include claims that are factual and need verification. Skip subjective opinions or general statements.

Outline:
${input.outline}`;

      const claimsResult = await generateText({
        model: getModel("writer"),
        prompt: claimsExtractionPrompt,
        temperature: 0.3,
      });

      let questions: VerificationQuestion[] = [];
      try {
        // Try to parse the JSON response
        const jsonMatch = claimsResult.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error("Failed to parse claims:", error);
        console.log("Raw response:", claimsResult.text);
        // Return empty array if parsing fails
        return {
          value: { questions: [], verifiedData: [] },
          completeData: { questionsCount: 0 },
        };
      }

      console.log(
        `\n[Verify Context] Extracted ${questions.length} claims to verify\n`
      );

      // Step 2: Use AI to group related claims to reduce API calls
      let claimGroups: ClaimGroup[] = [];

      if (questions.length === 0) {
        claimGroups = [];
      } else if (questions.length === 1) {
        claimGroups = [
          {
            claims: questions,
            combinedQuestion: questions[0].question,
            groupTopic: "single",
          },
        ];
      } else {
        // Use AI to intelligently group claims
        const groupingPrompt = `You are an expert at grouping related factual claims for efficient verification.

Given a list of claims and their verification questions, group related claims together based on:
1. Same company/product/service
2. Related topic (e.g., all pricing claims, all feature claims)
3. Can be answered by a single search query

Rules:
- Maximum 5 claims per group (split if more)
- If claims are unrelated, keep them separate
- Create a concise combined question that covers all claims in the group

Claims to group:
${questions.map((q, i) => `${i + 1}. Claim: "${q.claim}"\n   Question: "${q.question}"`).join("\n\n")}

Return a JSON array of groups with this structure:
[
  {
    "claimIndexes": [0, 1, 2],
    "groupTopic": "eesel AI pricing",
    "combinedQuestion": "What are eesel AI's pricing plans, features, and billing options?"
  }
]

Keep groups logical and efficient. If a claim doesn't fit with others, put it in its own group.`;

        try {
          const groupingResult = await generateText({
            model: getModel("writer"),
            prompt: groupingPrompt,
            temperature: 0.3,
          });

          const jsonMatch = groupingResult.text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            console.warn(
              "[Verify Context] Failed to parse AI grouping, falling back to individual claims"
            );
            claimGroups = questions.map((q) => ({
              claims: [q],
              combinedQuestion: q.question,
              groupTopic: "ungrouped",
            }));
          } else {
            const aiGroups: Array<{
              claimIndexes: number[];
              groupTopic: string;
              combinedQuestion: string;
            }> = JSON.parse(jsonMatch[0]);

            // Convert AI groups to ClaimGroup format
            claimGroups = aiGroups.map((group) => ({
              claims: group.claimIndexes.map((idx) => questions[idx]),
              combinedQuestion: group.combinedQuestion,
              groupTopic: group.groupTopic,
            }));
          }
        } catch (error) {
          console.error("[Verify Context] Error in AI grouping:", error);
          // Fallback: each claim in its own group
          claimGroups = questions.map((q) => ({
            claims: [q],
            combinedQuestion: q.question,
            groupTopic: "fallback",
          }));
        }
      }

      console.log(
        `\n[Verify Context] AI grouped into ${claimGroups.length} verification queries (reduced from ${questions.length})\n`
      );
      claimGroups.forEach((group, idx) => {
        console.log(
          `  Group ${idx + 1} [${group.groupTopic}]: ${group.claims.length} claims`
        );
      });

      // Step 3: Verify each group using SERP API Google AI Mode
      const serpApiKey = process.env.SERPAPI_API_KEY;
      if (!serpApiKey) {
        console.warn(
          "SERPAPI_API_KEY not found. Skipping verification step."
        );
        return {
          value: { questions, verifiedData: [] },
          completeData: { questionsCount: questions.length, verified: false },
        };
      }

      const verifiedData: VerificationQuestion[] = [];

      for (const group of claimGroups) {
        try {
          const url = new URL("https://serpapi.com/search");
          url.searchParams.append("engine", "google_ai_mode");
          url.searchParams.append("q", group.combinedQuestion);
          url.searchParams.append("api_key", serpApiKey);

          console.log(`\n[Verify Context] Querying: ${group.combinedQuestion}`);

          const response = await fetch(url.toString());
          const data = await response.json();

          // Extract the answer from text_blocks
          let answer = "";
          let source = "";
          if (data.text_blocks && Array.isArray(data.text_blocks)) {
            // Combine all paragraph snippets to form the answer
            const paragraphs = data.text_blocks
              .filter((block: any) => block.type === "paragraph")
              .map((block: any) => block.snippet)
              .join("\n\n");

            answer = paragraphs || "No answer found";
          }

          // Extract source URL from references (Google AI Mode returns references instead of organic_results)
          if (data.references && Array.isArray(data.references) && data.references.length > 0) {
            // Get the first reference that has a link
            const firstReference = data.references.find((ref: any) => ref.link);
            source = firstReference?.link || "";
          } else if (data.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
            // Fallback to organic_results for standard Google search
            source = data.organic_results[0].link || "";
          }

          // Apply the same answer and source to all claims in the group
          for (const claim of group.claims) {
            verifiedData.push({
              claim: claim.claim,
              question: claim.question,
              answer,
              source,
            });

            console.log(`\n[Verify Context] Verified claim: ${claim.claim}`);
          }

          console.log(`Answer: ${answer.substring(0, 200)}...`);
          console.log(`Source: ${source}`);
        } catch (error) {
          console.error(
            `Failed to verify group question: ${group.combinedQuestion}`,
            error
          );
          // Add failed verification for all claims in the group
          for (const claim of group.claims) {
            verifiedData.push({
              claim: claim.claim,
              question: claim.question,
              answer: "Verification failed",
            });
          }
        }
      }

      console.log(
        `\n========== [Verify Context] Completed ==========`
      );
      console.log(`Verified ${verifiedData.length} claims`);
      console.log("=================================================\n");

      return {
        value: { questions, verifiedData },
        completeData: {
          questionsCount: questions.length,
          verifiedCount: verifiedData.length,
        },
      };
    }
  );
}
