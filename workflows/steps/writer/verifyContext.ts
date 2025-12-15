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
};

type VerifyContextResult = {
  questions: VerificationQuestion[];
  verifiedData: VerificationQuestion[];
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

For each claim, generate a concise question that can be answered by a search engine to verify the information.

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

      // Step 2: Verify each question using SERP API Google AI Mode
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

      for (const item of questions) {
        try {
          const url = new URL("https://serpapi.com/search");
          url.searchParams.append("engine", "google_ai_mode");
          url.searchParams.append("q", item.question);
          url.searchParams.append("api_key", serpApiKey);

          const response = await fetch(url.toString());
          const data = await response.json();

          // Extract the answer from text_blocks
          let answer = "";
          if (data.text_blocks && Array.isArray(data.text_blocks)) {
            // Combine all paragraph snippets to form the answer
            const paragraphs = data.text_blocks
              .filter((block: any) => block.type === "paragraph")
              .map((block: any) => block.snippet)
              .join("\n\n");

            answer = paragraphs || "No answer found";
          }

          verifiedData.push({
            claim: item.claim,
            question: item.question,
            answer,
          });

          console.log(`\n[Verify Context] Verified claim: ${item.claim}`);
          console.log(`Answer: ${answer.substring(0, 200)}...`);
        } catch (error) {
          console.error(
            `Failed to verify question: ${item.question}`,
            error
          );
          verifiedData.push({
            claim: item.claim,
            question: item.question,
            answer: "Verification failed",
          });
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
