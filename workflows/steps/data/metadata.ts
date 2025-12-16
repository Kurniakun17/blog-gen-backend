import { deriveMetadata, type MetadataResult } from "@/lib/metadata";
import { runStep, type TimedResult } from "../../utils/steps";

type MetadataStepInput = {
  topic: string;
  keyword?: string | null;
  additionalContext?: string | null;
};

export async function metadataStep(
  input: MetadataStepInput
): Promise<TimedResult<MetadataResult>> {
  return runStep(
    "metadata",
    {
      topic: input.topic,
    },
    async () => {
      "use step";

      return {
        "value": {
          "keyword": "best ai customer support agents",
          "blogType": "listicle",
          "tone": "Casual",
          "userIntent": "",
          "outline": "",
          "additionalContext": "",
          "slug": "best-ai-customer-support-agents-en",
          "raw": {
            "keywords": "best ai customer support agents",
            "type": "Listicle",
            "tone_of_voice": "Casual",
            "outline": "",
            "additional_context": "",
            "user_intent": ""
          }
        },
        "completeData": {
          "keyword": "best ai customer support agents",
          "tone": "Casual"
        }
      }
      
      const metadata = await deriveMetadata({
        topic: input.topic,
        additionalContext: input.additionalContext || "",
      });

      console.log(`\n========== Metadata Result ==========\n`, metadata);
      return {
        value: metadata,
        completeData: {
          keyword: metadata.keyword,
          tone: metadata.tone,
        },
      };
    }
  );
}
