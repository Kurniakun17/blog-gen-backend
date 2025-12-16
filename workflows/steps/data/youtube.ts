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

    return {
      "value": {
        "results": "1. Stop Overwhelming Your Support Team: Top AI Customer ...\n   URL: https://www.youtube.com/watch?v=xpF-8rNzAFE\n   Channel: YouTube · ClickUp\n   Description: This video will introduce you to some of the best AI agents redefining the customer service domain.\n\n2. 9 Best AI Customer Service Software 2025 (AI Agents ...\n   URL: https://www.youtube.com/watch?v=FWnI65I3U6o\n   Channel: YouTube · Business Solution\n   Description: We'll cover powerful tools like BoldDesk, JustCall, Lindy.ai, monday Service, Jotform AI Agents, RingCentral, Freshdesk, Tidio, and Synthesys.\n\n3. 3 Best Practices for AI Customer Service Agents\n   URL: https://www.youtube.com/watch?v=2TARVtJ_9OU\n   Channel: YouTube · Klaviyo\n   Description: This video breaks down how an ai agent for customer service can streamline both support and sales, instantly answering customer questions, ...\n\n4. 7 Best AI Agents for Productivity 2025 (Ranked by Best Use ...\n   URL: https://www.youtube.com/watch?v=ja4-mmmK-Qw\n   Channel: YouTube · Business Solution\n   Description: We research the best AI agent platforms on the market right now and break them down by category so you can easily figure out which one fits your workflow best.\n\n5. Fin by Intercom: the #1 AI Agent for customer service\n   URL: https://www.youtube.com/watch?v=cSF-bIaDujU\n   Channel: YouTube · Intercom\n   Description: Finn is the number one AI agent for customer service resolving the most complex queries and delivering highquality answers.\n\n6. Meet Zendesk AI Agents: The most autonomous AI for ...\n   URL: https://www.youtube.com/watch?v=GvoRdGPleXk\n   Channel: YouTube · Zendesk\n   Description: Our AI agents don't just process tasks. They reason they learn they adapt and they resolve even the most sophisticated issues.\n\n7. These 5 AI Agents Will Make You $1M With Zero Employees\n   URL: https://www.youtube.com/watch?v=sIugzOQz7Vk\n   Channel: YouTube · Dan Martell\n   Description: I'm going to share the five types of AI agents you can use to build a million-dollar business without hiring more employees.\n\n8. I Tried 325 AI Tools, These Are The Best.\n   URL: https://www.youtube.com/watch?v=huariiK4_us\n   Channel: YouTube · 9x\n   Description: I'm going to share what I believe to be the best AI tools that you can use to do everything from boosting your personal productivity.\n\n9. 5 NEW AI That Just Changed Cold Email Forever\n   URL: https://www.youtube.com/watch?v=7Jh21WypgMg\n   Channel: YouTube · Instantly\n   Description: ... AI to boost your outreach, you'll want to watch this. I break down the exact AI agents and AI workflows I'm using to automate everything from AI ...\n\n10. Build the BEST 2025 Customer Support AI AGENT | Botpress ...\n   URL: https://www.youtube.com/watch?v=9B3oZwtzmmk\n   Channel: YouTube · Lowe Lundgren\n   Description: Are you a business owner looking to automate your business with AI? Visit my website to book a call with me now!",
        "videoCount": 0
      },
      "completeData": {
        "keyword": "best ai customer support agents",
        "videoCount": 0
      }
    }
    

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
