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
