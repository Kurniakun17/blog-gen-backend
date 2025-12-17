import FirecrawlApp from "firecrawl";
import { XMLParser } from "fast-xml-parser";

const WATCH_URL = "https://www.youtube.com/watch?v=";
const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?key=";
const INNERTUBE_CONTEXT = {
  client: {
    hl: "en",
    gl: "US",
    clientName: "WEB",
    clientVersion: "2.20241107.00.00",
  },
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const TIMEOUT_MS = 10000;

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
  kind?: string;
  isTranslatable?: boolean;
};

type TranslationLanguage = {
  languageCode?: string;
};

type PlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
      translationLanguages?: TranslationLanguage[];
    };
  };
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
};

export interface YouTubeTranscriptResult {
  url: string;
  success: boolean;
  transcript: string | null;
  error: string | null;
}

function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
      ...init?.headers,
    },
  }).finally(() => clearTimeout(timeout));
}

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (idPattern.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      const slug = url.pathname.split("/").filter(Boolean)[0];
      if (slug && idPattern.test(slug)) return slug;
    }
    const vParam = url.searchParams.get("v");
    if (vParam && idPattern.test(vParam)) return vParam;
    const pathParts = url.pathname.split("/").filter(Boolean);
    const shortsIndex = pathParts.indexOf("shorts");
    if (
      shortsIndex !== -1 &&
      pathParts[shortsIndex + 1] &&
      idPattern.test(pathParts[shortsIndex + 1])
    ) {
      return pathParts[shortsIndex + 1];
    }
    const embedIndex = pathParts.indexOf("embed");
    if (
      embedIndex !== -1 &&
      pathParts[embedIndex + 1] &&
      idPattern.test(pathParts[embedIndex + 1])
    ) {
      return pathParts[embedIndex + 1];
    }
  } catch {
    /* ignore */
  }

  const fallback = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  if (fallback) return fallback[1];

  throw new Error("Could not extract a YouTube video id from input");
}

function extractInnertubeApiKey(html: string): string {
  const match = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  if (match && match[1]) return match[1];
  throw new Error("Unable to locate YouTube INNERTUBE_API_KEY");
}

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack {
  const cleaned = tracks.map((track) => ({
    ...track,
    baseUrl: track.baseUrl?.replace("&fmt=srv3", ""),
  }));

  const manual = cleaned.filter((track) => track.kind !== "asr");
  const generated = cleaned.filter((track) => track.kind === "asr");

  const englishManual = manual.find((track) =>
    track.languageCode?.toLowerCase().startsWith("en")
  );
  if (englishManual) return englishManual;

  const englishGenerated = generated.find((track) =>
    track.languageCode?.toLowerCase().startsWith("en")
  );
  if (englishGenerated) return englishGenerated;

  const englishAny = cleaned.find((track) =>
    track.languageCode?.toLowerCase().startsWith("en")
  );
  if (englishAny) return englishAny;

  return manual[0] || generated[0] || cleaned[0];
}

function findEnglishTranslationCode(
  translationLanguages: TranslationLanguage[] | undefined
) {
  if (!translationLanguages) return null;
  const entry = translationLanguages.find((lang) =>
    lang.languageCode?.toLowerCase().startsWith("en")
  );
  return entry?.languageCode ?? null;
}

function buildTranscriptUrl(
  track: CaptionTrack,
  translationLanguages: TranslationLanguage[] | undefined
) {
  const baseUrl = track.baseUrl ?? "";
  const isEnglish = track.languageCode?.toLowerCase().startsWith("en");
  const englishTranslation = findEnglishTranslationCode(translationLanguages);

  if (!isEnglish && track.isTranslatable && englishTranslation) {
    return `${baseUrl}&tlang=${englishTranslation}`;
  }

  return baseUrl;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function stripHtml(input: string) {
  const withoutTags = input.replace(/<[^>]*>/g, "").trim();
  return decodeHtmlEntities(withoutTags);
}

function parseTranscriptXml(xml: string): string[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "#text",
    processEntities: true,
  });

  const parsed = parser.parse(xml) as {
    transcript?: { text?: unknown };
    timedtext?: { text?: unknown };
  };
  const textNodes = parsed?.transcript?.text || parsed?.timedtext?.text || [];
  const entries = Array.isArray(textNodes) ? textNodes : [textNodes];

  return entries
    .map((node: unknown) => {
      if (typeof node === "string") return stripHtml(node);
      if (
        node &&
        typeof node === "object" &&
        "#text" in node &&
        typeof (node as { "#text": unknown })["#text"] === "string"
      )
        return stripHtml((node as { "#text": string })["#text"]);
      return "";
    })
    .filter(Boolean);
}

async function fetchPlayerData(
  videoId: string,
  apiKey: string
): Promise<PlayerResponse> {
  const response = await fetchWithTimeout(`${INNERTUBE_API_URL}${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  });

  if (!response.ok) {
    throw new Error(`YouTube player API returned status ${response.status}`);
  }

  return response.json() as Promise<PlayerResponse>;
}

async function fetchTranscriptFromTrack(
  track: CaptionTrack
): Promise<string[]> {
  if (!track.baseUrl) {
    throw new Error("Caption track is missing a base URL");
  }

  const response = await fetchWithTimeout(track.baseUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }

  const xml = await response.text();
  return parseTranscriptXml(xml);
}

async function firecrawlScrapeRawHtml(url: string): Promise<string> {
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlApiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set");
  }

  const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
  const result = await firecrawl.scrape(url, {
    formats: ["rawHtml"],
    onlyMainContent: false,
  });

  if (!result?.rawHtml) {
    throw new Error("Failed to scrape raw HTML from YouTube page");
  }

  return result.rawHtml;
}

export async function grabYoutubeTranscript(
  youtubeUrl: string
): Promise<string> {
  const videoId = extractVideoId(youtubeUrl);
  const watchUrl = `${WATCH_URL}${videoId}`;

  const html = await firecrawlScrapeRawHtml(watchUrl);
  const apiKey = extractInnertubeApiKey(html);
  const playerData = await fetchPlayerData(videoId, apiKey);
  const captionsRenderer = playerData.captions?.playerCaptionsTracklistRenderer;

  if (!captionsRenderer?.captionTracks?.length) {
    throw new Error("Transcripts are disabled or unavailable for this video");
  }

  const track = pickCaptionTrack(captionsRenderer.captionTracks);
  const transcriptUrl = buildTranscriptUrl(
    track,
    captionsRenderer.translationLanguages
  );

  const snippets = await fetchTranscriptFromTrack({
    ...track,
    baseUrl: transcriptUrl,
  });

  if (!snippets.length) {
    throw new Error("Transcript fetched but contained no text");
  }

  return snippets.join(" ");
}

export async function fetchYouTubeTranscripts(urls: string[]): Promise<{
  results: YouTubeTranscriptResult[];
  combinedTranscripts: string;
}> {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const transcript = await grabYoutubeTranscript(url);
        return { url, success: true, transcript, error: null };
      } catch (e) {
        return {
          url,
          success: false,
          transcript: null,
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }
    })
  );

  const combinedTranscripts = results
    .filter((result) => result.success && result.transcript)
    .map((result) => `[Video: ${result.url}]\n${result.transcript}`)
    .join("\n\n---\n\n");

  return {
    results,
    combinedTranscripts:
      combinedTranscripts || "No transcripts were successfully fetched.",
  };
}

export function formatYouTubeTranscriptsForOutline(
  results: YouTubeTranscriptResult[]
): string {
  const successfulTranscripts = results.filter(
    (r) => r.success && r.transcript
  );

  if (successfulTranscripts.length === 0) {
    return "No YouTube transcripts available.";
  }

  let formatted = `Found ${successfulTranscripts.length} YouTube transcript(s):\n\n`;

  successfulTranscripts.forEach((result, index) => {
    const truncatedTranscript =
      result.transcript && result.transcript.length > 2000
        ? result.transcript.substring(0, 2000) + "..."
        : result.transcript;

    formatted += `${index + 1}. Video URL: ${result.url}\n`;
    formatted += `   Transcript:\n   ${truncatedTranscript}\n\n`;
  });

  return formatted.trim();
}
