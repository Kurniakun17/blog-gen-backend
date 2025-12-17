import {
  fetchYouTubeTranscripts,
  formatYouTubeTranscriptsForOutline,
  type YouTubeTranscriptResult,
} from "@/lib/youtubeTranscript";
import { runStep, type TimedResult } from "../../utils/steps";

export interface YouTubeTranscriptStepInput {
  youtubeUrls: string[];
  maxTranscripts?: number;
}

export interface YouTubeTranscriptStepOutput {
  results: YouTubeTranscriptResult[];
  formattedTranscripts: string;
  successCount: number;
}

export async function youtubeTranscriptStep(
  input: YouTubeTranscriptStepInput
): Promise<TimedResult<YouTubeTranscriptStepOutput>> {
  return runStep("youtube-transcript", undefined, async () => {
    "use step";

    const urlsToProcess = input.maxTranscripts
      ? input.youtubeUrls.slice(0, input.maxTranscripts)
      : input.youtubeUrls;

    console.log(
      `[YouTubeTranscript] Fetching transcripts for ${urlsToProcess.length} videos`
    );

    const { results } = await fetchYouTubeTranscripts(urlsToProcess);

    const successCount = results.filter((r) => r.success).length;
    const formattedTranscripts = formatYouTubeTranscriptsForOutline(results);

    console.log(
      `[YouTubeTranscript] Successfully fetched ${successCount}/${urlsToProcess.length} transcripts`
    );

    return {
      value: {
        results,
        formattedTranscripts,
        successCount,
      },
      completeData: {
        totalUrls: urlsToProcess.length,
        successCount,
        failedCount: urlsToProcess.length - successCount,
      },
    };
  });
}
