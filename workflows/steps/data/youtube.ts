import { searchYouTubeVideos } from "@/lib/youtube";
import { runStep, type TimedResult } from "../../utils/steps";

export interface YouTubeStepInput {
  keyword: string;
  limit?: number;
}

export interface YouTubeStepOutput {
  results: string;
  videoCount: number;
}

/**
 * YouTube search step - searches for relevant YouTube videos using SerpApi
 * @param input - Keyword to search for YouTube videos
 * @returns Formatted YouTube search results
 */
export async function youtubeStep(
  input: YouTubeStepInput
): Promise<TimedResult<YouTubeStepOutput>> {
  return runStep("youtube", undefined, async () => {
    "use step";

    const results = await searchYouTubeVideos(input.keyword, input.limit);

    // Count the number of videos found
    const videoCount = results.includes("Found")
      ? parseInt(results.match(/Found (\d+) YouTube/)?.[1] || "0")
      : 0;

    return {
      value: {
        results,
        videoCount,
      },
      completeData: {
        keyword: input.keyword,
        videoCount,
      },
    };
  });
}
