import { searchYouTubeVideosWithUrls } from "@/lib/youtube";
import { runStep, type TimedResult } from "../../utils/steps";

export interface YouTubeStepInput {
  keyword: string;
  limit?: number;
}

export interface YouTubeStepOutput {
  results: string;
  videoCount: number;
  videoUrls: string[];
}

/**
 * YouTube search step - searches for relevant YouTube videos using SerpApi
 * @param input - Keyword to search for YouTube videos
 * @returns Formatted YouTube search results with video URLs
 */
export async function youtubeStep(
  input: YouTubeStepInput
): Promise<TimedResult<YouTubeStepOutput>> {
  return runStep("youtube", undefined, async () => {
    "use step";

    const { formattedResults, urls } = await searchYouTubeVideosWithUrls(
      input.keyword,
      input.limit
    );

    return {
      value: {
        results: formattedResults,
        videoCount: urls.length,
        videoUrls: urls,
      },
      completeData: {
        keyword: input.keyword,
        videoCount: urls.length,
      },
    };
  });
}
