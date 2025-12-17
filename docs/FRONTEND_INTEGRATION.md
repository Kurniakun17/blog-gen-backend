# Backend Integration Guide for Frontend

Dokumentasi lengkap untuk integrasi frontend dengan Blog Generation Backend setelah migrasi dari N8N ke Vercel Workflow.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Migration Summary](#migration-summary)
3. [Available Endpoints](#available-endpoints)
4. [Streaming Architecture](#streaming-architecture)
5. [Implementation Examples](#implementation-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Architecture Overview

### Current Architecture (After Migration)

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ POST /api/generate-blog (full) or
     │ POST /api/generate-blog-preview (lite)
     │
     ▼
┌──────────────────┐
│ Next.js Backend  │
│ (Vercel)         │
└────┬─────────────┘
     │
     ├──────────────────────────┐
     │                          │
     ▼                          ▼
┌─────────────────┐    ┌─────────────────┐
│ Vercel Workflow │    │ Supabase        │
│ (Orchestration) │    │ (Persistence)   │
│                 │    │                 │
│ - AI Calls      │    │ - Final Results │
│ - Scraping      │    │ - Step History  │
│ - Processing    │    │ - Analytics     │
└────┬────────────┘    └─────────────────┘
     │
     │ Real-time Streaming
     ▼
┌──────────┐
│ Frontend │
│ (Updates)│
└──────────┘
```

### Key Components

1. **Vercel Workflow**: Orchestrates the entire blog generation pipeline
2. **Workflow Streaming**: Real-time progress updates (replaces Supabase Realtime)
3. **Supabase**: Persistent storage for results and history (not for pub-sub)
4. **Next.js API Routes**: RESTful endpoints for frontend

---

## Migration Summary

### Before Migration (N8N Architecture)

```
Frontend → Supabase insert row
  ↓ (Database Trigger)
N8N Webhook
  ↓ (Processing)
Supabase updates
  ↓ (Supabase Realtime)
Frontend receives updates
```

**Problems:**
- ❌ Complex dependency on N8N
- ❌ Tight coupling with Supabase
- ❌ Additional Realtime costs
- ❌ Difficult to debug

### After Migration (Vercel Workflow)

```
Frontend → Backend API
  ↓
Vercel Workflow (streaming)
  ↓                    ↓
Frontend (real-time)   Supabase (persistence)
```

**Benefits:**
- ✅ Direct backend control
- ✅ Built-in streaming (no extra costs)
- ✅ Type-safe workflow
- ✅ Better error handling
- ✅ Easier debugging

---

## Available Endpoints

### 1. Full Blog Generation

**Endpoint:** `POST /api/generate-blog`

**Description:** Generates a complete, production-ready blog post with all features.

**Request Body:**
```typescript
{
  topic: string;              // Required: Blog topic
  keyword?: string;           // Optional: Target keyword (auto-extracted if not provided)
  additional_context?: string;// Optional: Extra context for AI
  company_url?: string;       // Optional: Company URL for context gathering
  internalUsage?: boolean;    // Optional: Enable WordPress publishing (default: false)
  waitForResult?: boolean;    // Optional: Wait for completion or async (default: true)
}
```

**Response (Success - 200 OK):**
```typescript
{
  runId: string;

  // Content
  content: string;              // Final formatted HTML/markdown with assets
  title: string;                // Meta title
  slug: string;                 // URL-friendly slug
  metaDescription: string;      // SEO meta description
  excerpt: string;              // Blog excerpt
  tags: string[];               // Generated tags
  faqs: Array<{                 // FAQ section
    question: string;
    answer: string;
  }>;

  // WordPress (if internalUsage=true)
  publishedToWordPress?: boolean;
  wordPressPostId?: number;
  liveBlogURL?: string;
  categoryId?: number;
  bannerId?: number;

  // Metadata
  metadata: {
    keyword: string;
    blogType: string;
    tone: string;
    slug: string;
    outline?: string;
    additionalContext?: string;
  };

  companyProfile?: {
    company_name: string;
    company_profile: string;
    company_pages: Array<{
      title: string;
      url: string;
      snippet?: string;
    }>;
  };

  // Performance
  diagnostics: Array<{
    phase: string;
    durationMs: number;
  }>;

  keywordUsed: string;
}
```

**Response (Async - 202 Accepted):**
```typescript
{
  message: "Blog workflow started";
  runId: string;
  status: "pending" | "running";
}
```

**Pipeline Phases (in order):**
1. `metadata` - Extract metadata from topic
2. `company_profile` - Gather company information
3. `research` - Conduct topic research
4. `youtube` - Search YouTube videos
5. `youtube-transcript` - Fetch transcripts
6. `generate-outline` - Create blog outline
7. `gather-research-urls` - Extract URLs from outline
8. `scrape-research-urls` - Scrape research sources
9. `outline-verified` - Refine outline with verified data
10. `meta-text-splitter` - Extract meta title, description, tags
11. `write-first-draft` - Generate initial content
12. `final-polish` - Polish content (humanize, adjust headings)
13. `gather-internal-links` - Find internal linking opportunities
14. `linking-sources` - Add internal/external links
15. `review-flow` - Final review and FAQ generation
16. `assets-definer` - Mark asset placement locations
17. `assets-search` - Search for images/videos
18. `assets-process-tags` - Embed found assets
19. `banner-picker` - Select featured image (if internalUsage)
20. `publish-to-wordpress` - Publish to WordPress (if internalUsage)

---

### 2. Blog Preview (Lite Version)

**Endpoint:** `POST /api/generate-blog-preview`

**Description:** Generates a quick preview with outline and first draft only (no polish, assets, or publishing).

**Request Body:** Same as `/api/generate-blog`

**Response (Success - 200 OK):**
```typescript
{
  runId: string;

  // Content
  content: string;              // First draft (unpolished)
  title: string;                // Meta title
  slug: string;
  metaDescription: string;
  excerpt: string;
  tags: string[];
  outline: string;              // Verified outline used for draft

  // Metadata
  metadata: { /* same as full */ };
  companyProfile?: { /* same as full */ };

  // Performance
  diagnostics: Array<{ phase: string; durationMs: number }>;
  keywordUsed: string;
}
```

**Pipeline Phases (shorter):**
1. `metadata`
2. `company_profile`
3. `research`
4. `youtube`
5. `youtube-transcript`
6. `generate-outline`
7. `gather-research-urls`
8. `scrape-research-urls`
9. `outline-verified`
10. `meta-text-splitter`
11. `write-first-draft` ← **Stops here**

**Use Case:** Preview content direction before running full workflow.

---

## Streaming Architecture

### Overview

Vercel Workflow provides built-in streaming for real-time progress updates, eliminating the need for Supabase Realtime.

### How It Works

1. **Backend writes progress** as each workflow step completes
2. **Vercel Workflow** persists stream chunks (Redis in production, filesystem in dev)
3. **Frontend consumes** stream via Server-Sent Events (SSE)
4. **Supabase saves** final results for history (async, not blocking)

### Stream Data Format

```typescript
type StepProgress = {
  phase: string;                    // Step name (e.g., "metadata", "research")
  status: "start" | "complete" | "error";
  timestamp: string;                // ISO 8601 timestamp
  durationMs?: number;              // Only for "complete" status
  data?: Record<string, unknown>;   // Optional additional data
};
```

### Example Stream Events

```json
{"phase":"metadata","status":"start","timestamp":"2025-12-17T10:30:00.000Z"}
{"phase":"metadata","status":"complete","timestamp":"2025-12-17T10:30:02.345Z","durationMs":2345}
{"phase":"research","status":"start","timestamp":"2025-12-17T10:30:02.346Z"}
{"phase":"research","status":"complete","timestamp":"2025-12-17T10:30:15.123Z","durationMs":12777}
...
```

---

## Implementation Examples

### 1. Simple Request (Wait for Result)

```typescript
// TypeScript/JavaScript
async function generateBlog(input: {
  topic: string;
  keyword?: string;
  company_url?: string;
}) {
  const response = await fetch('/api/generate-blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      waitForResult: true, // Wait for completion
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate blog');
  }

  const result = await response.json();
  return result;
}

// Usage
const blog = await generateBlog({
  topic: 'AI in Healthcare',
  keyword: 'medical AI applications',
  company_url: 'https://example.com',
});

console.log(blog.title);
console.log(blog.content);
```

---

### 2. Async Request (Get runId, Poll Later)

```typescript
// Start workflow
async function startBlogGeneration(input) {
  const response = await fetch('/api/generate-blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      waitForResult: false, // Start async
    }),
  });

  const { runId, status } = await response.json();
  return runId;
}

// Poll for status (simple approach)
async function pollWorkflowStatus(runId: string) {
  const response = await fetch(`/api/workflow-status/${runId}`);
  const { status, result } = await response.json();

  if (status === 'completed') {
    return result;
  } else if (status === 'failed') {
    throw new Error('Workflow failed');
  }

  // Continue polling
  await new Promise(r => setTimeout(r, 3000));
  return pollWorkflowStatus(runId);
}

// Usage
const runId = await startBlogGeneration({ topic: 'AI in Healthcare' });
const result = await pollWorkflowStatus(runId);
```

---

### 3. Real-time Streaming (Recommended for Best UX)

```typescript
// React Hook Example
import { useState, useEffect } from 'react';

interface ProgressStep {
  phase: string;
  status: 'start' | 'complete' | 'error';
  timestamp: string;
  durationMs?: number;
}

function useBlogGeneration() {
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const generateWithStreaming = async (input: {
    topic: string;
    keyword?: string;
    company_url?: string;
  }) => {
    setIsGenerating(true);
    setProgress([]);
    setError(null);

    try {
      const response = await fetch('/api/generate-blog-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsGenerating(false);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setProgress(prev => [...prev, data.step]);
              setCurrentPhase(data.step.phase);
            } else if (data.type === 'complete') {
              setResult(data.result);
            } else if (data.type === 'error') {
              setError(data.message);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  return {
    generateWithStreaming,
    progress,
    currentPhase,
    isGenerating,
    result,
    error,
  };
}

// Component Usage
function BlogGenerator() {
  const { generateWithStreaming, progress, currentPhase, isGenerating, result, error } = useBlogGeneration();

  const handleGenerate = () => {
    generateWithStreaming({
      topic: 'AI in Healthcare',
      keyword: 'medical AI applications',
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Blog'}
      </button>

      {isGenerating && (
        <div>
          <h3>Progress: {currentPhase}</h3>
          <ul>
            {progress.map((step, i) => (
              <li key={i}>
                {step.phase} - {step.status}
                {step.durationMs && ` (${step.durationMs}ms)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div>
          <h2>{result.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: result.content }} />
        </div>
      )}

      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

---

### 4. Progress Bar with Phases

```typescript
// React component with progress visualization
function BlogGenerationProgress({ progress }: { progress: ProgressStep[] }) {
  const totalPhases = 20; // Full workflow has 20 phases
  const completedPhases = progress.filter(p => p.status === 'complete').length;
  const percentage = Math.round((completedPhases / totalPhases) * 100);

  const phaseLabels: Record<string, string> = {
    metadata: 'Analyzing topic...',
    company_profile: 'Gathering company info...',
    research: 'Researching topic...',
    youtube: 'Finding videos...',
    'generate-outline': 'Creating outline...',
    'write-first-draft': 'Writing content...',
    'final-polish': 'Polishing content...',
    'assets-search': 'Finding images...',
    'publish-to-wordpress': 'Publishing...',
  };

  const currentStep = progress[progress.length - 1];
  const currentLabel = currentStep
    ? phaseLabels[currentStep.phase] || currentStep.phase
    : 'Starting...';

  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${percentage}%` }} />
      <p>{currentLabel} ({percentage}%)</p>

      <details>
        <summary>View detailed progress</summary>
        <ul>
          {progress.map((step, i) => (
            <li key={i}>
              <span className={`status-${step.status}`}>
                {step.phase}
              </span>
              {step.durationMs && ` - ${(step.durationMs / 1000).toFixed(2)}s`}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  error: string;        // Error type
  message: string;      // Human-readable message
  details?: any;        // Additional error details
}
```

### Common Error Codes

| Status Code | Error | Description | Action |
|-------------|-------|-------------|--------|
| 400 | Validation error | Invalid request body | Check request format |
| 401 | Unauthorized | Missing/invalid auth | Add authentication |
| 429 | Rate limit exceeded | Too many requests | Implement retry with backoff |
| 500 | Internal server error | Server-side failure | Contact support or retry |
| 503 | Service unavailable | Workflow service down | Retry later |

### Error Handling Example

```typescript
async function generateBlogWithRetry(input, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        const error = await response.json();

        if (response.status >= 500) {
          // Server error - retry with exponential backoff
          lastError = error;
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
          continue;
        }

        // Client error - don't retry
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      if (i === maxRetries - 1) throw err;
    }
  }

  throw lastError;
}
```

---

## Best Practices

### 1. Always Include Topic

```typescript
// ✅ Good
const result = await generateBlog({
  topic: 'Comprehensive Guide to React Hooks'
});

// ❌ Bad - will fail validation
const result = await generateBlog({
  keyword: 'react hooks'
});
```

### 2. Use Preview for Quick Validation

```typescript
// Generate preview first to validate direction
const preview = await fetch('/api/generate-blog-preview', {
  method: 'POST',
  body: JSON.stringify({ topic: 'AI in Healthcare' }),
});

// If preview looks good, run full generation
if (userApproved(preview)) {
  const fullBlog = await generateBlog({ topic: 'AI in Healthcare' });
}
```

### 3. Implement Timeout for Long-Running Workflows

```typescript
async function generateBlogWithTimeout(input, timeoutMs = 300000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/generate-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, waitForResult: false }),
      signal: controller.signal,
    });

    const { runId } = await response.json();
    return runId; // Poll separately
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4. Cache Results

```typescript
// Use runId as cache key
const CACHE_KEY = `blog-result-${runId}`;

// Check cache first
const cached = localStorage.getItem(CACHE_KEY);
if (cached) {
  return JSON.parse(cached);
}

// Generate and cache
const result = await generateBlog(input);
localStorage.setItem(CACHE_KEY, JSON.stringify(result));
```

### 5. Monitor Performance

```typescript
function analyzeDiagnostics(diagnostics: Array<{ phase: string; durationMs: number }>) {
  const slowPhases = diagnostics.filter(d => d.durationMs > 10000);

  if (slowPhases.length > 0) {
    console.warn('Slow phases detected:', slowPhases);
  }

  const totalDuration = diagnostics.reduce((sum, d) => sum + d.durationMs, 0);
  console.log(`Total generation time: ${(totalDuration / 1000).toFixed(2)}s`);
}

const result = await generateBlog(input);
analyzeDiagnostics(result.diagnostics);
```

### 6. Handle Network Interruptions

```typescript
async function generateWithReconnection(input) {
  const response = await fetch('/api/generate-blog-stream', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const runId = response.headers.get('X-Run-Id');
  let lastIndex = 0;

  async function consumeStream(startIndex = 0) {
    const stream = await fetch(`/api/workflow-stream/${runId}?startIndex=${startIndex}`);
    const reader = stream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lastIndex++;
        // Process chunk
      }
    } catch (err) {
      // Network error - reconnect from last position
      console.log('Reconnecting from index', lastIndex);
      await consumeStream(lastIndex);
    }
  }

  await consumeStream();
}
```

---

## Comparison Table

| Feature | Full Generation | Preview |
|---------|----------------|---------|
| **Endpoint** | `/api/generate-blog` | `/api/generate-blog-preview` |
| **Phases** | 20 steps | 11 steps |
| **Content** | Fully polished with assets | First draft only |
| **Internal Links** | ✅ Yes | ❌ No |
| **External Links** | ✅ Yes | ❌ No |
| **Images/Videos** | ✅ Yes | ❌ No |
| **FAQs** | ✅ Yes | ❌ No |
| **WordPress Publish** | ✅ Optional | ❌ No |
| **Avg Duration** | 3-5 minutes | 1-2 minutes |
| **Use Case** | Production-ready blog | Quick preview/validation |

---

## Support & Troubleshooting

### Common Issues

**Issue: Workflow takes too long**
- Solution: Use preview endpoint first, or check `diagnostics` to identify slow phases

**Issue: Missing keyword**
- Solution: System auto-extracts from topic, but providing explicit keyword improves results

**Issue: Stream disconnects**
- Solution: Implement reconnection logic with `startIndex` parameter (see Best Practices #6)

**Issue: Content doesn't match company context**
- Solution: Ensure `company_url` is provided and publicly accessible

### Debug Mode

Enable verbose logging by checking backend console for detailed phase logs:
```
========== [workflow] phase=metadata status=start ==========
========== [workflow] phase=metadata status=complete ==========
```

---

## Future Roadmap

- [ ] Add webhook callback support
- [ ] Implement batch generation API
- [ ] Add content customization options (length, style, etc.)
- [ ] Support multiple languages
- [ ] Add image generation via DALL-E/Midjourney
- [ ] Real-time collaboration features

---

## Questions?

Contact the backend team or open an issue in the repository.

**Last Updated:** 2025-12-17
