# BuildResume — Design Spec

**Date:** 2026-05-01
**Author:** Amit Yadav (with Claude)
**Status:** Approved

## Goal

Web app that turns a job description and/or an existing resume into an ATS-friendly resume rendered in a fixed LaTeX template (the user's personal template). Two modes:

- **Tailor** — given a JD + existing resume, produce a tailored, ATS-aligned resume.
- **Enhance** — given a resume only, produce a higher-scoring rewrite plus a before/after score breakdown.

The UI must show the entire processing pipeline as an animated, step-by-step view. The user can preview the generated PDF in-app and download it.

## Non-Goals (v1)

- Multiple templates / theme switching.
- Authentication, accounts, saved resumes.
- Cover letter generation.
- Free-form editing of tailored content (only the header is editable pre-compile).
- Recruiter-style keyword density visualizer beyond the dimension scores already produced.

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Single deploy for UI + API; first-class streaming. |
| Hosting | Vercel | Free tier, native Next.js. |
| Runtime | Edge runtime for `/api/generate` | Fast cold starts, native streaming. |
| AI | Google Gemini API (Gemini Flash) | Free tier sustainable long-term, structured JSON output. |
| Realtime | Server-Sent Events (SSE) | Simpler than WebSockets, perfect for one-way pipeline progress. |
| PDF rendering | SwiftLaTeX (WASM `pdflatex` in browser, in a Web Worker) | Renders the user's exact template (custom macros). No server LaTeX cost. |
| PDF text extract | `pdf.js` in the browser | Edge runtime can't run Node-only `pdf-parse`; client-side extract avoids the upload-then-parse round-trip and keeps API streaming. |
| Tests | Vitest | Already standard for Next.js stacks. |

## Architecture

```
┌────────────────────── Browser (Next.js client) ──────────────────────┐
│  Mode picker  →  Input form  →  Pipeline view  →  Preview/Download   │
│                                       ▲                              │
│                                       │ SSE events                   │
│                                       │                              │
│  SwiftLaTeX WASM (compile .tex → PDF in browser, no server LaTeX)    │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │ POST /api/generate (streams)
                                       ▼
┌──────────────────── Next.js API route (Edge runtime) ────────────────┐
│   Pipeline orchestrator (mode A: tailor / mode B: enhance)           │
│   ├─ Gemini SDK (Flash) — multiple structured calls                  │
│   ├─ LaTeX template renderer (string interpolation w/ escapes)       │
│   └─ SSE writer — emits {step, status, payload} per phase            │
└──────────────────────────────────────────────────────────────────────┘

PDF text extraction happens client-side via pdf.js before POST.
The API receives only the extracted resume text (and JD text for Mode A).
```

### Repo layout

```
app/
  page.tsx                  Mode picker
  tailor/page.tsx           Mode A flow
  enhance/page.tsx          Mode B flow
  api/generate/route.ts     SSE pipeline endpoint
components/
  PipelineView.tsx          Animated step list
  StepCard.tsx              Single step (icon + label + status)
  ResumePreview.tsx         PDF iframe (SwiftLaTeX output)
  ScoreCard.tsx             Before/after dimension bars (Mode B)
  HeaderEditor.tsx          Editable name/email/phone modal
  ActionBar.tsx             Preview / Download .pdf / Download .tex
  InputPanel.tsx            PDF dropzone + textarea + JD textarea
  ModePicker.tsx            Two big mode cards
lib/
  pipeline/
    tailor.ts               Mode A orchestrator
    enhance.ts              Mode B orchestrator
    steps/                  Pure async step functions
      parseInputs.ts
      analyzeJd.ts
      extractResume.ts
      tailor.ts
      scoreBefore.ts
      rewrite.ts
      scoreAfter.ts
      renderLatex.ts
  gemini.ts                 SDK wrapper, retry, JSON-mode helpers
  latex/
    template.ts             LaTeX renderer + escape utils
    compile.ts              SwiftLaTeX client wrapper (Web Worker)
  pdf.ts                    pdf.js client-side text extractor
  sse.ts                    SSE event encoder/decoder helpers
types/
  resume.ts                 ResumeData, JDAnalysis, Score, PipelineEvent
tests/
  fixtures/                 sample-resume.pdf, sample-jd.txt, expected.json, expected.tex
  unit/                     escapeLatex, renderResume, pdf, gemini
  integration/              orchestrator with mocked Gemini
templates/
  resume.tex                Reference copy of user's LaTeX template
```

## Core Data Types

```ts
type ResumeData = {
  header: {
    name: string; email: string; phone: string;
    portfolio?: string; github?: string; linkedin?: string;
  };
  experience: Array<{
    company: string; location: string; role: string; dates: string;
    bullets: Array<{ title: string; detail: string }>;
  }>;
  projects: Array<{
    name: string; url?: string; tagline: string;
    description: string; tech: string;
  }>;
  skills: { languages: string; frameworks: string; tools: string; soft: string };
  achievements: Array<{ title: string; url?: string; detail: string }>;
  coursework: Array<{ title: string; detail: string }>;
  education: Array<{ school: string; location: string; degree: string; dates: string }>;
};

type JDAnalysis = {
  role: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  keywords: string[];
  tone: 'technical' | 'leadership' | 'product' | 'research';
  seniority: 'intern' | 'junior' | 'mid' | 'senior';
};

type Score = {
  overall: number;          // 0–100
  dimensions: {
    actionVerbs: number;
    quantification: number;
    keywordBreadth: number;
    bulletStrength: number;
    clarity: number;
    length: number;
  };
  weaknesses: string[];     // human-readable
};

type PipelineEvent =
  | { type: 'step'; id: string;
      status: 'pending' | 'running' | 'done' | 'error';
      label: string; durationMs?: number; payload?: unknown }
  | { type: 'final'; tex: string; before?: Score; after?: Score }
  | { type: 'error'; stepId: string; message: string };
```

## Components

| Component | Responsibility |
|---|---|
| `ModePicker` | Two big cards: "Tailor to JD" / "Enhance Resume". |
| `InputPanel` | PDF dropzone (5MB cap, MIME-sniff PDF) + textarea fallback + JD textarea (Mode A only). PDF is converted to text via pdf.js in the browser before POST. |
| `PipelineView` | Vertical animated step list with connectors. |
| `StepCard` | Single step row: icon + label + status (pending/running/done/error) + collapsed payload preview. |
| `HeaderEditor` | Modal that opens after extract step; lets user confirm/edit name, email, phone, links before render. Required if any field missing. |
| `ScoreCard` | Animated dimension bars + overall ring. Shows before/after for Mode B. |
| `ResumePreview` | iframe pointing at the SwiftLaTeX-produced PDF blob URL. |
| `ActionBar` | Buttons: Preview, Download .pdf, Download .tex. |

### Step function contract

```ts
type StepFn<I, O> = (
  input: I,
  ctx: { emit: (e: PipelineEvent) => void; gemini: GeminiClient }
) => Promise<O>;
```

Pure async. Emits `step:running` on entry and `step:done` on exit (with `durationMs`). Throws → orchestrator emits `step:error` and halts.

## Data Flow

### Mode A — Tailor

`POST /api/generate` body: `{ mode: 'tailor', resumeText, jdText }`
(PDF was already converted to text in the browser via pdf.js before POST.)

```
[1] parse-inputs        normalize whitespace + strip non-printable + clean JD text
        │
        ├──► [2a] analyze-jd       Gemini → JDAnalysis
        └──► [2b] extract-resume   Gemini → ResumeData      (parallel)
              │
              ▼
[3] tailor              Gemini (merged match+rewrite)
                        Input: ResumeData + JDAnalysis
                        Output: ResumeData' (reordered, bullets rewritten,
                                keywords woven in, weakest items dropped)
        │
        ▼
[4] render-latex        Pure: ResumeData' → .tex string
        │
        ▼
[5] emit final          { tex } via SSE
        │
        ▼ (client)
[6] compile-pdf         SwiftLaTeX in Web Worker → PDF blob
[7] preview/download
```

### Mode B — Enhance

`POST /api/generate` body: `{ mode: 'enhance', resumeText }`
(PDF was already converted to text in the browser via pdf.js before POST.)

```
[1] parse-inputs
[2] extract-resume      Gemini → ResumeData
[3] score-before        Gemini → Score (dimensions + weaknesses)
[4] rewrite             Gemini → ResumeData' (strong verbs, conservative
                        metric inference, tighten, ATS phrasing)
[5] score-after         Gemini → Score (re-rate the rewritten data)
[6] render-latex        same as Mode A
[7] emit final          { tex, before, after }
[8] compile-pdf, preview, download
```

### SSE event timeline (example, Mode A)

```
event: step  data: {id:"parse",      status:"running", label:"Parse inputs"}
event: step  data: {id:"parse",      status:"done",    durationMs:120}
event: step  data: {id:"analyze-jd", status:"running", label:"Analyze JD"}
event: step  data: {id:"extract",    status:"running", label:"Extract resume"}
event: step  data: {id:"analyze-jd", status:"done",    payload:{role:"…",keywords:8}}
event: step  data: {id:"extract",    status:"done",    payload:{exp:2,projects:3}}
event: step  data: {id:"tailor",     status:"running", label:"Tailor content"}
event: step  data: {id:"tailor",     status:"done"}
event: step  data: {id:"render",     status:"running", label:"Render LaTeX"}
event: step  data: {id:"render",     status:"done"}
event: final data: {tex:"\\documentclass…"}
```

### Gemini call hygiene

- All LLM calls use `responseMimeType: application/json` plus a JSON schema.
- Retry once on JSON parse failure with a stricter "return ONLY valid JSON matching schema X" prompt.
- Temperature: 0.2 for extract/score; 0.6 for rewrite/tailor.
- Prompts include the LaTeX template as reference so the model knows the target structure.
- Use Gemini context cache where available; otherwise inline.

## Error Handling

| Failure | Behavior |
|---|---|
| PDF unparseable | Client-side pdf.js throws → toast "couldn't read PDF, paste text instead" → stay on input screen (no API call made). |
| Gemini 429 | Auto-retry once after 2s; second fail → SSE error → UI shows step red + retry button. Retry re-runs the **full** pipeline (Edge instances are stateless; no step-resume). |
| Gemini bad JSON | One repair retry with stricter prompt; second fail → degrade gracefully (e.g. score-after = score-before with "score unavailable" note). |
| Gemini network/5xx | Retry 2× with exponential backoff; then SSE error. |
| LaTeX compile error in browser | Show compile log in collapsible panel, offer "Download .tex" so user can debug on Overleaf. |
| User closes tab mid-run | Server abort via `req.signal`; nothing to clean up (no DB). |
| Header missing post-extract | After extract, `HeaderEditor` modal forced open; render blocked until name + email + phone present. |

### Orchestrator behavior

- Each step wrapped in try/catch.
- On error: emit `error` event, mark step status, halt the pipeline (no cascade to dependents).
- Retry button re-POSTs the original payload; the **entire** pipeline reruns. No server-side memoization across requests (Edge instances are stateless and ephemeral).

## LaTeX Rendering Layer

`lib/latex/template.ts`:

```ts
escapeLatex(s: string): string
  // Replace: & % $ # _ { } ~ ^ \ → \& \% \$ \# \_ \{ \} \textasciitilde{} ...
  // Leave URL strings alone (they go inside \href{}{}).

renderResume(data: ResumeData): string
  // Single template literal building the full .tex.
  // Uses the exact preamble + custom commands from the user's template.
  // Skips sections whose data array is empty.
  // Returns full compilable .tex string.
```

**Why string-template (not Handlebars/EJS):** the LaTeX template uses many `{` `}` braces that conflict with templating engines. Plain TS template literals + small helper fns are clearest and dependency-free.

`lib/latex/compile.ts` (SwiftLaTeX wrapper):

- Lazy-load WASM bundle on first compile (show one-time "loading LaTeX engine ~10MB" spinner).
- Cache the engine in module scope; subsequent compiles reuse it.
- Run inside a Web Worker so the UI doesn't freeze during compile.
- Returns `{ pdfBlob, log }`. Failed compiles still return the log for diagnostics.

## Security

- Strip non-printable characters from parsed resume text before sending to LLM (defense vs prompt injection).
- LaTeX escaping prevents injection of `\write18` and other shell-escape macros (and SwiftLaTeX disables shell-escape anyway).
- File upload validation: max 5 MB, MIME-sniff PDF, reject anything else.
- Gemini API key is server-side only (`process.env.GEMINI_API_KEY`); never shipped to client. Edge runtime reads it at request time.

## Testing Strategy

| Layer | Tool | Coverage |
|---|---|---|
| Unit — pure fns | Vitest | `escapeLatex`, `renderResume` (golden snapshot fixture → expected `.tex`). |
| Unit — pipeline steps | Vitest + mocked Gemini | Each step fn with stubbed LLM responses; confirms shape, error paths, JSON parse retry. |
| Integration — orchestrator | Vitest | Full Mode A and Mode B with mocked Gemini → asserts SSE event sequence; failure injection at each step. |
| LaTeX golden compile | One-off CI script | Render fixture `ResumeData` → compile via SwiftLaTeX (or local `pdflatex`) → assert exit 0. Catches escape/template regressions. |
| Manual smoke | Browser | Real Gemini key, real PDF, real JD — visual check on pipeline animation, preview, download. |

Skipped (not worth the cost v1): e2e Playwright, Gemini live-call tests (flaky + quota), formal a11y audit (manual pass enough).

Fixtures live under `tests/fixtures/`: `sample-resume.pdf`, `sample-jd.txt`, `expected.resume.json`, `expected.resume.tex`.

## Open Questions

None at spec time. Future questions (e.g. multiple templates, auth) are explicitly deferred to v2.

## Acceptance Criteria

1. User on the home screen can pick "Tailor" or "Enhance".
2. **Tailor:** uploading a PDF resume + pasting a JD produces a downloadable PDF rendered in the user's exact LaTeX template, with content visibly tailored to the JD.
3. **Enhance:** uploading a PDF resume produces a downloadable rewritten PDF plus a visible before/after score (overall + dimensions).
4. Throughout each run, the pipeline view animates step transitions live (pending → running → done/error), driven by SSE.
5. After completion, "Preview" opens the PDF in-app and "Download" saves the file.
6. PDF compile errors do not crash the page; the user can download the `.tex` instead.
7. Missing or unparseable header fields force the `HeaderEditor` modal before render.
8. App runs on Vercel free tier without paid LaTeX or PDF compute infra.
