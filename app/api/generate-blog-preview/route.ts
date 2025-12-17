import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { start } from "workflow/api";
import {
  generateBlogPreviewWorkflow,
  type GenerateBlogPreviewResponse,
} from "@/workflows/generate-blog-preview";
import { generateBlogSchema } from "@/workflows/generate-blog";

const logStep = (message: string, data?: unknown) => {
  if (data === undefined) {
    console.log(`\n========== ${message} ==========\n`);
  } else {
    console.log(`\n========== ${message} ==========\n`, data);
  }
};

const requestSchema = generateBlogSchema.extend({
  waitForResult: z.boolean().optional(),
});

function validationError(issues: z.ZodIssue[]) {
  return NextResponse.json(
    {
      error: "Validation error",
      details: issues,
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues);
    const { waitForResult = true, ...validatedInput } = parsed.data;

    logStep("[api] phase=generate-blog-preview status=init", {
      topic: validatedInput.topic,
      keyword: validatedInput.keyword,
      companyUrl: validatedInput.company_url,
      internalUsage: validatedInput.internalUsage,
      waitForResult,
    });

    const run = await start(generateBlogPreviewWorkflow, [validatedInput]);

    if (!waitForResult) {
      const status = await run.status;
      logStep("[api] phase=generate-blog-preview status=started", {
        runId: run.runId,
        status,
      });
      return NextResponse.json(
        {
          message: "Blog preview workflow started",
          runId: run.runId,
          status,
        },
        { status: 202 }
      );
    }

    const output = (await run.returnValue) as GenerateBlogPreviewResponse;

    logStep("[api] phase=generate-blog-preview status=complete", {
      runId: run.runId,
      diagnostics: output.diagnostics,
      keywordUsed: output.keywordUsed,
      hasTitle: Boolean(output.title),
    });
    return NextResponse.json(
      {
        runId: run.runId,
        ...output,
      },
      { status: 200 }
    );
  } catch (error) {
    logStep("[api] phase=generate-blog-preview status=error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
