import { addLinkingSources } from "@/lib/writer";
import { runStep, type TimedResult } from "../../utils/steps";

type LinkingSourcesStepInput = {
  blogContent: string;
  blogType: string;
  internalLinks: string[];
  externalUrls: string[];
  internalUsage?: boolean;
  verifiedSources?: string[];
};

type LinkedContentResult = {
  contentWithLinks: string;
};

export async function linkingSourcesStep(
  input: LinkingSourcesStepInput
): Promise<TimedResult<LinkedContentResult>> {
  return runStep(
    "linking-sources",
    {
      blogType: input.blogType,
      internalLinksCount: input.internalLinks.length,
      externalUrlsCount: input.externalUrls.length,
      internalUsage: input.internalUsage,
    },
    async () => {
      "use step";
      const contentWithLinks = await addLinkingSources(
        input.blogContent,
        input.blogType,
        input.internalLinks,
        input.externalUrls,
        input.internalUsage,
        input.verifiedSources
      );
      return {
        value: { contentWithLinks },
        completeData: { linkedContentChars: contentWithLinks.length },
      };
    }
  );
}
