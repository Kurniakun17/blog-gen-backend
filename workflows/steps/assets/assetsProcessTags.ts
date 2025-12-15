import { runStep, type TimedResult } from "../../utils/steps";

type AssetsProcessTagsStepInput = {
  contentWithProcessedAssets: string;
  outputFormat?: "html" | "markdown";
};

/**
 * Step 3: Process Tags & Reconstruct
 * Parses remaining <assets> tags and applies final conversions to HTML or Markdown
 *
 * NOTE: All conversion logic is inlined to avoid workflow serialization issues
 */
export async function assetsProcessTagsStep(
  input: AssetsProcessTagsStepInput
): Promise<TimedResult<string>> {
  return runStep("assets-process-tags", undefined, async () => {
    "use step";

    console.log("\n========== [Assets Process Tags] Starting ==========");
    console.log(
      "Input content length:",
      input.contentWithProcessedAssets.length
    );
    console.log(
      "Remaining <assets> tags:",
      (input.contentWithProcessedAssets.match(/<assets>/g) || []).length
    );
    console.log(
      "__IMAGE:: placeholders:",
      (input.contentWithProcessedAssets.match(/__IMAGE::/g) || []).length
    );
    console.log(
      "__SCREENSHOTS:: placeholders:",
      (input.contentWithProcessedAssets.match(/__SCREENSHOTS::/g) || []).length
    );
    console.log(
      "__VIDEO:: placeholders:",
      (input.contentWithProcessedAssets.match(/__VIDEO::/g) || []).length
    );
    console.log("Output format:", input.outputFormat || "html");
    console.log("====================================================\n");

    const format = input.outputFormat || "html";
    const imagePattern =
      /\*{0,}__IMAGE::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;
    const screenshotPattern =
      /\*{0,}__SCREENSHOTS::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;
    const videoPattern =
      /\*{0,}__VIDEO::(.*?)::([^:]+?)::(.+?)(?:__|(?=\n)|$)\*{0,}/g;

    const processHtml = (content: string): string => {
      let htmlContent = content;

      htmlContent = htmlContent.replace(/<assets>[\s\S]*?<\/assets>/gi, "");

      htmlContent = htmlContent.replace(
        imagePattern,
        (_match, url, _title, caption) => {
          return `<pre><img class="alignnone size-medium wp-image" src="${url.trim()}" alt="${caption.trim()}" width="300" height="169" />${caption.trim()}</pre>`;
        }
      );

      htmlContent = htmlContent.replace(
        screenshotPattern,
        (_match, url, _title, caption) => {
          return `<pre><img class="alignnone size-medium wp-image" src="${url.trim()}" alt="${caption.trim()}" width="300" height="169" />${caption.trim()}</pre>`;
        }
      );

      htmlContent = htmlContent.replace(videoPattern, (_match, url) => {
        return `[video width="2560" height="1440" mp4="${url.trim()}"][/video]`;
      });

      htmlContent = htmlContent.replace(
        /<iframe[^>]*>.*?<\/iframe>[^\n]*(?:\n[^\n]*)*?(?=\n\n|\n$|$)/g,
        (match) => {
          return `<pre>${match.trim()}</pre>\n\n`;
        }
      );

      htmlContent = htmlContent.replace(
        /<pre>([\s\S]*?)<\/pre>/g,
        (_match, content) => {
          const cleanedContent = content
            .replace(/(<\/iframe>)\s*\n+\s*/g, "$1")
            .replace(/\s+/g, " ")
            .trim();
          return `<pre>${cleanedContent}</pre>`;
        }
      );

      htmlContent = htmlContent.replace(/::\s*<\/pre>/g, "</pre>");
      htmlContent = htmlContent.replace(/:\s*<\/pre>/g, "</pre>");

      return htmlContent;
    };

    const processMarkdown = (content: string): string => {
      let markdownContent = content;

      markdownContent = markdownContent.replace(
        /<assets>[\s\S]*?<\/assets>/gi,
        ""
      );

      markdownContent = markdownContent.replace(
        imagePattern,
        (_match, url, title, caption) => {
          const cleanUrl = url.trim();
          const cleanTitle = title.trim();
          const cleanCaption = caption.trim();
          return `![${cleanCaption}](${cleanUrl})\n\n_${cleanCaption}_`;
        }
      );

      markdownContent = markdownContent.replace(
        screenshotPattern,
        (_match, url, title, caption) => {
          const cleanUrl = url.trim();
          const cleanTitle = title.trim();
          const cleanCaption = caption.trim();
          return `![${cleanCaption}](${cleanUrl})\n\n_${cleanCaption}_`;
        }
      );

      markdownContent = markdownContent.replace(
        videoPattern,
        (_match, url, title, caption) => {
          const cleanUrl = url.trim();
          const cleanTitle = title.trim();
          const cleanCaption = caption.trim();
          return `[${cleanTitle || "Video"}](${cleanUrl})\n\n_${
            cleanCaption || "Watch the video for more context."
          }_`;
        }
      );

      return markdownContent;
    };

    const textContent =
      format === "markdown"
        ? processMarkdown(input.contentWithProcessedAssets)
        : processHtml(input.contentWithProcessedAssets);

    console.log("\n========== [Assets Process Tags] Completed ==========");
    console.log("Output length:", textContent.length);
    console.log(
      "<pre> tags created:",
      (textContent.match(/<pre>/g) || []).length
    );
    console.log(
      "Output preview (first 500 chars):",
      textContent.substring(0, 500) || "(empty)"
    );
    console.log("=====================================================\n");

    return {
      value: textContent,
      completeData: {
        contentChars: textContent.length,
        replacementsApplied: 0,
      },
    };
  });
}
