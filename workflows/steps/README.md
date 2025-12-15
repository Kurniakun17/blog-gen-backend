# Workflow Steps

This directory contains all workflow step implementations, organized by category.

## Structure

```
steps/
├── writer/              # Content generation steps
│   ├── generateOutline.ts
│   ├── writeFirstDraft.ts
│   ├── finalPolish.ts
│   ├── reviewFlow.ts
│   └── linkingSources.ts
│
├── assets/              # Visual assets steps
│   ├── assetsDefiner.ts
│   ├── assetsSearch.ts
│   └── assetsProcessTags.ts
│
├── data/                # Data gathering steps
│   ├── metadata.ts
│   ├── companyProfile.ts
│   ├── research.ts
│   └── youtube.ts
│
├── format.ts            # WordPress formatting (deprecated)
└── write.ts             # Legacy combined writer (deprecated)
```

## Step Categories

### 1. Data Gathering (`/data`)
Steps that gather and prepare input data:

- **metadata.ts** - Extract blog metadata (keyword, type, tone)
- **companyProfile.ts** - Fetch company profile and context
- **research.ts** - Research topic using SerpAPI and Firecrawl
- **youtube.ts** - Search for relevant YouTube videos

**Order:** These run first in parallel (metadata + company) or early in sequence.

### 2. Content Generation (`/writer`)
Steps that create and refine blog content:

- **generateOutline.ts** - Generate blog outline structure
- **writeFirstDraft.ts** - Write initial blog draft
- **finalPolish.ts** - Polish content (humanize, SEO)
- **linkingSources.ts** - Add internal/external links
- **reviewFlow.ts** - Final review and metadata extraction

**Order:** Run sequentially: Outline → Draft → Polish → Linking → Review

### 3. Visual Assets (`/assets`)
Steps that add visual elements to content:

- **assetsDefiner.ts** - Place `<assets>` tags in content
- **assetsSearch.ts** - Search/generate actual assets
- **assetsProcessTags.ts** - Convert tags to final format

**Order:** Run after review flow, sequentially: Definer → Search → Process

## Usage

### Import Pattern

```typescript
// Data gathering steps
import { metadataStep } from "./steps/data/metadata";
import { companyProfileStep } from "./steps/data/companyProfile";
import { researchStep } from "./steps/data/research";
import { youtubeStep } from "./steps/data/youtube";

// Writer steps
import { generateOutlineStep } from "./steps/writer/generateOutline";
import { writeFirstDraftStep } from "./steps/writer/writeFirstDraft";
import { finalPolishStep } from "./steps/writer/finalPolish";
import { linkingSourcesStep } from "./steps/writer/linkingSources";
import { reviewFlowStep } from "./steps/writer/reviewFlow";

// Assets steps
import { assetsDefinerStep } from "./steps/assets/assetsDefiner";
import { assetsSearchStep } from "./steps/assets/assetsSearch";
import { assetsProcessTagsStep } from "./steps/assets/assetsProcessTags";
```

### Step Function Signature

All steps follow this pattern:

```typescript
export async function stepName(
  input: StepInput
): Promise<TimedResult<StepOutput>> {
  return runStep(
    "step-name",
    { /* tracking data */ },
    async () => {
      "use step";
      // Step logic here
      return {
        value: { /* output */ },
        completeData: { /* metrics */ },
      };
    }
  );
}
```

## Workflow Execution Order

1. **Phase 1: Data Gathering**
   - metadata + companyProfile (parallel)
   - research
   - youtube

2. **Phase 2: Content Generation**
   - generateOutline
   - writeFirstDraft
   - finalPolish
   - linkingSources
   - reviewFlow

3. **Phase 3: Asset Processing**
   - assetsDefiner
   - assetsSearch
   - assetsProcessTags

## Adding New Steps

### 1. Determine Category

- **Data gathering?** → `/data`
- **Content generation?** → `/writer`
- **Visual assets?** → `/assets`

### 2. Create Step File

```typescript
// steps/{category}/{stepName}.ts
import { runStep, type TimedResult } from "../../utils/steps";

type StepInput = {
  // Input parameters
};

type StepOutput = {
  // Output structure
};

export async function stepNameStep(
  input: StepInput
): Promise<TimedResult<StepOutput>> {
  return runStep(
    "step-name",
    { /* tracking */ },
    async () => {
      "use step";
      // Implementation
      return {
        value: { /* output */ },
        completeData: { /* metrics */ },
      };
    }
  );
}
```

### 3. Update Workflow

Add import and call in `generate-blog.ts`:

```typescript
import { newStep } from "./steps/{category}/{stepName}";

// In workflow:
const newResult = await newStep({ /* input */ });
diagnostics.push({
  phase: "step-name",
  durationMs: newResult.durationMs,
});
```

## Testing

Each step can be tested independently:

```typescript
// app/api/test-{step-name}/route.ts
import { stepNameStep } from "@/workflows/steps/{category}/{stepName}";

export async function POST(req: NextRequest) {
  const input = await req.json();
  const result = await stepNameStep(input);
  return NextResponse.json(result);
}
```

## Benefits of This Structure

1. **Clear Organization** - Steps grouped by purpose
2. **Easy Navigation** - Know exactly where to find/add steps
3. **Better Imports** - Clear path shows step category
4. **Scalability** - Easy to add new steps in right category
5. **Team Collaboration** - Different teams can work on different categories

## Migration Notes

This structure was created on Dec 12, 2024 to improve code organization.

**Previous structure:**
```
steps/
├── metadata.ts
├── companyProfile.ts
├── research.ts
└── (13 other files at root level)
```

**New structure:** Organized into 3 categories with clear separation of concerns.
