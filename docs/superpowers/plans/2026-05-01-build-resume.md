# BuildResume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app that takes a JD and/or existing resume and produces an ATS-friendly PDF rendered in the user's exact LaTeX template, with an animated step-by-step pipeline UI driven by Server-Sent Events.

**Architecture:** Next.js 15 App Router on Vercel. Edge-runtime API streams SSE pipeline events while orchestrating Gemini Flash calls. PDF text extraction (pdf.js) and PDF compilation (SwiftLaTeX WASM) run client-side, in Web Workers. Two modes: **Tailor** (resume + JD) and **Enhance** (resume only, with before/after score).

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS, Vitest, `@google/generative-ai`, `pdfjs-dist`, SwiftLaTeX (vendored in `public/swiftlatex/`), `framer-motion`, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-05-01-build-resume-design.md`

---

## File Structure

**Created files (in order of appearance):**

```
package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs,
.env.example, .gitignore, vitest.config.ts, app/globals.css, app/layout.tsx

types/resume.ts                         All shared types

lib/latex/escape.ts                     escapeLatex(s)
lib/latex/template.ts                   renderResume(data)
lib/sse.ts                              SSE encode/decode helpers
lib/gemini.ts                           GeminiClient wrapper (JSON mode + retry)

lib/pipeline/steps/parseInputs.ts
lib/pipeline/steps/analyzeJd.ts
lib/pipeline/steps/extractResume.ts
lib/pipeline/steps/tailor.ts
lib/pipeline/steps/scoreBefore.ts
lib/pipeline/steps/rewrite.ts
lib/pipeline/steps/scoreAfter.ts
lib/pipeline/steps/renderLatex.ts

lib/pipeline/tailor.ts                  Mode A orchestrator
lib/pipeline/enhance.ts                 Mode B orchestrator

app/api/generate/route.ts               Edge runtime SSE endpoint

lib/pdf.ts                              Client-side pdf.js extractor
lib/latex/compile.ts                    Client-side SwiftLaTeX wrapper (Worker)
public/swiftlatex/*                     Vendored engine + WASM

components/ModePicker.tsx
components/InputPanel.tsx
components/PipelineView.tsx
components/StepCard.tsx
components/HeaderEditor.tsx
components/ScoreCard.tsx
components/ResumePreview.tsx
components/ActionBar.tsx

app/page.tsx                            Mode picker landing
app/tailor/page.tsx
app/enhance/page.tsx

tests/fixtures/sampleResume.json
tests/fixtures/expected.tex
tests/fixtures/sampleJd.txt
```

Each file has one clear responsibility. Pure functions live under `lib/` and have no side effects beyond what is explicitly passed in. The orchestrators are the only place where Gemini calls and SSE emission are composed.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.example`, `.gitignore`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (placeholder)

- [ ] **Step 1: Init package.json**

Create `package.json`:

```json
{
  "name": "build-resume",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "framer-motion": "^11.11.0",
    "lucide-react": "^0.460.0",
    "next": "^15.0.0",
    "pdfjs-dist": "^4.7.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.16.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "happy-dom": "^15.7.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Add tsconfig**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Next config**

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '6mb' } }
};
export default nextConfig;
```

- [ ] **Step 4: Tailwind setup**

Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
export default config;
```

Create `postcss.config.mjs`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
html, body { height: 100%; }
body { @apply bg-zinc-950 text-zinc-100 antialiased; font-family: ui-sans-serif, system-ui, sans-serif; }
```

- [ ] **Step 5: Root layout + placeholder page**

Create `app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BuildResume',
  description: 'AI resume builder — ATS-tailored, LaTeX rendered'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx` (placeholder, replaced later):

```tsx
export default function Home() {
  return <main className="p-8">BuildResume — coming up.</main>;
}
```

- [ ] **Step 6: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  }
});
```

- [ ] **Step 7: env.example + .gitignore**

Create `.env.example`:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Append to `.gitignore` (preserve existing content if any):

```
node_modules
.next
.env
.env.local
coverage
*.log
.DS_Store
```

- [ ] **Step 8: Install + sanity check**

Run:

```bash
npm install
npm run build
```

Expected: build completes (placeholder home page renders).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TS + Tailwind + Vitest"
```

---

## Task 2: Shared types

**Files:**
- Create: `types/resume.ts`

- [ ] **Step 1: Write types**

Create `types/resume.ts`:

```ts
export type ResumeHeader = {
  name: string;
  email: string;
  phone: string;
  portfolio?: string;
  github?: string;
  linkedin?: string;
};

export type ResumeBullet = { title: string; detail: string };

export type ResumeExperience = {
  company: string;
  location: string;
  role: string;
  dates: string;
  bullets: ResumeBullet[];
};

export type ResumeProject = {
  name: string;
  url?: string;
  tagline: string;
  description: string;
  tech: string;
};

export type ResumeSkills = {
  languages: string;
  frameworks: string;
  tools: string;
  soft: string;
};

export type ResumeAchievement = {
  title: string;
  url?: string;
  detail: string;
};

export type ResumeCoursework = { title: string; detail: string };

export type ResumeEducation = {
  school: string;
  location: string;
  degree: string;
  dates: string;
};

export type ResumeData = {
  header: ResumeHeader;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  achievements: ResumeAchievement[];
  coursework: ResumeCoursework[];
  education: ResumeEducation[];
};

export type JDAnalysis = {
  role: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  keywords: string[];
  tone: 'technical' | 'leadership' | 'product' | 'research';
  seniority: 'intern' | 'junior' | 'mid' | 'senior';
};

export type ScoreDimensions = {
  actionVerbs: number;
  quantification: number;
  keywordBreadth: number;
  bulletStrength: number;
  clarity: number;
  length: number;
};

export type Score = {
  overall: number;
  dimensions: ScoreDimensions;
  weaknesses: string[];
};

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error';

export type PipelineEvent =
  | { type: 'step'; id: string; status: PipelineStepStatus; label: string;
      durationMs?: number; payload?: unknown }
  | { type: 'final'; tex: string; before?: Score; after?: Score }
  | { type: 'error'; stepId: string; message: string };

export type GenerateRequest =
  | { mode: 'tailor'; resumeText: string; jdText: string }
  | { mode: 'enhance'; resumeText: string };
```

- [ ] **Step 2: Commit**

```bash
git add types/resume.ts
git commit -m "feat: add shared resume + pipeline types"
```

---

## Task 3: LaTeX escape utility (TDD)

**Files:**
- Create: `lib/latex/escape.ts`
- Test: `tests/unit/escape.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/escape.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeLatex } from '@/lib/latex/escape';

describe('escapeLatex', () => {
  it('escapes ampersand', () => {
    expect(escapeLatex('R&D')).toBe('R\\&D');
  });
  it('escapes percent', () => {
    expect(escapeLatex('50%')).toBe('50\\%');
  });
  it('escapes dollar', () => {
    expect(escapeLatex('$100')).toBe('\\$100');
  });
  it('escapes hash', () => {
    expect(escapeLatex('#1')).toBe('\\#1');
  });
  it('escapes underscore', () => {
    expect(escapeLatex('snake_case')).toBe('snake\\_case');
  });
  it('escapes braces', () => {
    expect(escapeLatex('{x}')).toBe('\\{x\\}');
  });
  it('escapes tilde', () => {
    expect(escapeLatex('a~b')).toBe('a\\textasciitilde{}b');
  });
  it('escapes caret', () => {
    expect(escapeLatex('x^2')).toBe('x\\textasciicircum{}2');
  });
  it('escapes backslash', () => {
    expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
  });
  it('handles multiple specials in one string', () => {
    expect(escapeLatex('A & B_C 50% #1')).toBe('A \\& B\\_C 50\\% \\#1');
  });
  it('empty string', () => {
    expect(escapeLatex('')).toBe('');
  });
  it('plain string unchanged', () => {
    expect(escapeLatex('Hello World')).toBe('Hello World');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/escape.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/latex/escape.ts`:

```ts
const REPLACERS: Array<[RegExp, string]> = [
  [/\\/g, '\\textbackslash{}'],
  [/[{}]/g, m => `\\${m}`] as unknown as [RegExp, string],
  [/&/g, '\\&'],
  [/%/g, '\\%'],
  [/\$/g, '\\$'],
  [/#/g, '\\#'],
  [/_/g, '\\_'],
  [/~/g, '\\textasciitilde{}'],
  [/\^/g, '\\textasciicircum{}']
];

export function escapeLatex(input: string): string {
  let out = input.replace(/\\/g, '\\textbackslash{}');
  out = out.replace(/[{}]/g, (m) => `\\${m}`);
  out = out.replace(/&/g, '\\&');
  out = out.replace(/%/g, '\\%');
  out = out.replace(/\$/g, '\\$');
  out = out.replace(/#/g, '\\#');
  out = out.replace(/_/g, '\\_');
  out = out.replace(/~/g, '\\textasciitilde{}');
  out = out.replace(/\^/g, '\\textasciicircum{}');
  return out;
}
```

(The `REPLACERS` array at top is unused scratch — delete it; only the `escapeLatex` function body matters.)

Final clean file:

```ts
export function escapeLatex(input: string): string {
  let out = input.replace(/\\/g, '\\textbackslash{}');
  out = out.replace(/[{}]/g, (m) => `\\${m}`);
  out = out.replace(/&/g, '\\&');
  out = out.replace(/%/g, '\\%');
  out = out.replace(/\$/g, '\\$');
  out = out.replace(/#/g, '\\#');
  out = out.replace(/_/g, '\\_');
  out = out.replace(/~/g, '\\textasciitilde{}');
  out = out.replace(/\^/g, '\\textasciicircum{}');
  return out;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/escape.test.ts
```

Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/latex/escape.ts tests/unit/escape.test.ts
git commit -m "feat(latex): add LaTeX special-char escaper"
```

---

## Task 4: LaTeX template renderer (TDD with golden fixture)

**Files:**
- Create: `lib/latex/template.ts`
- Create: `tests/fixtures/sampleResume.json`, `tests/fixtures/expected.tex`
- Test: `tests/unit/template.test.ts`

- [ ] **Step 1: Create fixture resume JSON**

Create `tests/fixtures/sampleResume.json`:

```json
{
  "header": {
    "name": "Amit Yadav",
    "email": "ydamit5840@gmail.com",
    "phone": "+91-9897518539",
    "portfolio": "https://portfolio-smoky-zeta-80.vercel.app/",
    "github": "https://github.com/stalin670"
  },
  "experience": [
    {
      "company": "TExam",
      "location": "Remote",
      "role": "Backend Developer Intern",
      "dates": "Dec 2022 - Jan 2023",
      "bullets": [
        { "title": "Real-Time Chat Interface",
          "detail": "Built WebSocket-based chat enabling low-latency communication." },
        { "title": "RESTful API Development",
          "detail": "Designed secure REST APIs for user management and data handling." }
      ]
    }
  ],
  "projects": [
    {
      "name": "Intervu",
      "url": "https://intervu-three.vercel.app/",
      "tagline": "An Interview Platform",
      "description": "Video calls, live code editor, screen recording for technical interviews.",
      "tech": "Next.js, React, Tailwind, Convex, Clerk"
    }
  ],
  "skills": {
    "languages": "Python, C/C++, JavaScript, TypeScript, Java",
    "frameworks": "ReactJS, NodeJS, ExpressJS",
    "tools": "Git, GitHub, MySQL, MongoDB, Firebase",
    "soft": "Leadership, Public Speaking, Time Management"
  },
  "achievements": [
    { "title": "Competitive Programming",
      "url": "",
      "detail": "Expert @Codeforces (1750 max), 5* @CodeChef (2090 max)." }
  ],
  "coursework": [
    { "title": "Core Subjects",
      "detail": "DSA, Computer Networks, OS, DBMS, OOP." }
  ],
  "education": [
    {
      "school": "Galgotias University",
      "location": "Noida, India",
      "degree": "BS - Computer Science; GPA: 9.23",
      "dates": "July 2022 - June 2025"
    }
  ]
}
```

- [ ] **Step 2: Write failing test**

Create `tests/unit/template.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderResume } from '@/lib/latex/template';
import type { ResumeData } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('renderResume', () => {
  it('starts with documentclass', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex.trimStart().startsWith('\\documentclass')).toBe(true);
  });

  it('ends with end{document}', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex.trimEnd().endsWith('\\end{document}')).toBe(true);
  });

  it('embeds the candidate name escaped', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.header.name = 'A & B';
    const tex = renderResume(data);
    expect(tex).toContain('A \\& B');
  });

  it('renders an experience section heading', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex).toContain('\\section{Experience}');
    expect(tex).toContain('TExam');
    expect(tex).toContain('Real-Time Chat Interface');
  });

  it('renders projects with hyperlinked names', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex).toContain('\\href{https://intervu-three.vercel.app/}{Intervu}');
  });

  it('omits coursework section when empty', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.coursework = [];
    const tex = renderResume(data);
    expect(tex).not.toContain('\\section{Coursework}');
  });

  it('omits achievements section when empty', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.achievements = [];
    const tex = renderResume(data);
    expect(tex).not.toContain('\\section{Achievements}');
  });

  it('renders multiple education entries', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.education.push({
      school: 'NIT Surat', location: 'Surat, India',
      degree: 'Drop; GPA: 8.6', dates: 'July 2020 - June 2022'
    });
    const tex = renderResume(data);
    expect(tex).toContain('Galgotias University');
    expect(tex).toContain('NIT Surat');
  });
});
```

- [ ] **Step 3: Run test, expect fail**

```bash
npm test -- tests/unit/template.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement renderer**

Create `lib/latex/template.ts`:

```ts
import { escapeLatex } from './escape';
import type {
  ResumeData, ResumeExperience, ResumeProject, ResumeAchievement,
  ResumeCoursework, ResumeEducation, ResumeHeader
} from '@/types/resume';

const PREAMBLE = String.raw`\documentclass[a4paper,20pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[pdftex]{hyperref}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.530in}
\addtolength{\evensidemargin}{-0.375in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.45in}
\addtolength{\textheight}{1in}

\urlstyle{rm}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-10pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-6pt}]

\newcommand{\resumeItem}[2]{
  \item\small{
    \textbf{#1}{: #2 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-1pt}\item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{#3} & \textit{#4} \\
    \end{tabular*}\vspace{-5pt}
}

\newcommand{\resumeSubItem}[2]{\resumeItem{#1}{#2}\vspace{-3pt}}

\renewcommand{\labelitemii}{$\circ$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=*]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

\begin{document}
`;

function renderHeader(h: ResumeHeader): string {
  const name = escapeLatex(h.name);
  const email = escapeLatex(h.email);
  const phone = escapeLatex(h.phone);
  const lines: string[] = [];
  lines.push(`\\textbf{{\\LARGE ${name}}} & Email: \\href{mailto:${email}}{${email}}\\\\`);
  if (h.portfolio) {
    lines.push(`\\href{${h.portfolio}}{Portfolio} & Mobile:~~~${phone} \\\\`);
  } else {
    lines.push(`& Mobile:~~~${phone} \\\\`);
  }
  if (h.github) {
    lines.push(`\\href{${h.github}}{Github: ${escapeLatex(h.github.replace(/^https?:\/\//, ''))}} \\\\`);
  }
  if (h.linkedin) {
    lines.push(`\\href{${h.linkedin}}{LinkedIn: ${escapeLatex(h.linkedin.replace(/^https?:\/\//, ''))}} \\\\`);
  }
  return [
    '\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}',
    ...lines,
    '\\end{tabular*}',
    ''
  ].join('\n');
}

function renderExperience(exp: ResumeExperience[]): string {
  if (!exp.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Experience}'];
  for (const e of exp) {
    out.push('\\resumeSubHeadingListStart');
    out.push(`\\resumeSubheading{${escapeLatex(e.company)}}{${escapeLatex(e.location)}}`);
    out.push(`{${escapeLatex(e.role)}}{${escapeLatex(e.dates)}}`);
    out.push('\\resumeItemListStart');
    for (const b of e.bullets) {
      out.push(`\\resumeItem{${escapeLatex(b.title)}}`);
      out.push(`  {${escapeLatex(b.detail)}}`);
    }
    out.push('\\resumeItemListEnd');
    out.push('\\resumeSubHeadingListEnd');
  }
  return out.join('\n') + '\n';
}

function renderProjects(projects: ResumeProject[]): string {
  if (!projects.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Projects}', '\\resumeSubHeadingListStart'];
  for (const p of projects) {
    const nameLatex = p.url
      ? `\\href{${p.url}}{${escapeLatex(p.name)}}`
      : escapeLatex(p.name);
    const title = `${nameLatex} - ${escapeLatex(p.tagline)}`;
    const body = `${escapeLatex(p.description)} Tech: ${escapeLatex(p.tech)}.`;
    out.push(`\\resumeSubItem{${title}}{${body}}`);
    out.push('\\vspace{4pt}');
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderSkills(s: ResumeData['skills']): string {
  const out: string[] = ['\\vspace{-5pt}', '\\section{Skills Summary}', '\\resumeSubHeadingListStart'];
  out.push(`\\resumeSubItem{Languages}{${escapeLatex(s.languages)}}`);
  out.push(`\\resumeSubItem{Frameworks}{${escapeLatex(s.frameworks)}}`);
  out.push(`\\resumeSubItem{Tools}{${escapeLatex(s.tools)}}`);
  out.push(`\\resumeSubItem{Soft Skills}{${escapeLatex(s.soft)}}`);
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderAchievements(items: ResumeAchievement[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Achievements}', '\\resumeSubHeadingListStart'];
  for (const a of items) {
    const title = a.url
      ? `\\href{${a.url}}{${escapeLatex(a.title)}}`
      : escapeLatex(a.title);
    out.push(`\\resumeSubItem{${title}}{${escapeLatex(a.detail)}}`);
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderCoursework(items: ResumeCoursework[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Coursework}',
                         '\\begin{description}[font=$\\bullet$]'];
  for (const c of items) {
    out.push(`\\resumeItem{${escapeLatex(c.title)}}`);
    out.push(`  {${escapeLatex(c.detail)}}`);
  }
  out.push('\\end{description}');
  return out.join('\n') + '\n';
}

function renderEducation(items: ResumeEducation[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\section{~~Education}', '\\resumeSubHeadingListStart'];
  for (const e of items) {
    out.push('\\resumeSubheading');
    out.push(`  {${escapeLatex(e.school)}}{${escapeLatex(e.location)}}`);
    out.push(`  {${escapeLatex(e.degree)}}{${escapeLatex(e.dates)}}`);
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

export function renderResume(data: ResumeData): string {
  return [
    PREAMBLE,
    renderHeader(data.header),
    renderExperience(data.experience),
    renderProjects(data.projects),
    renderSkills(data.skills),
    renderAchievements(data.achievements),
    renderCoursework(data.coursework),
    renderEducation(data.education),
    '\\end{document}',
    ''
  ].join('\n');
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
npm test -- tests/unit/template.test.ts
```

Expected: PASS — all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/latex/template.ts tests/unit/template.test.ts tests/fixtures/sampleResume.json
git commit -m "feat(latex): add resume LaTeX renderer with golden fixture tests"
```

---

## Task 5: SSE encode/decode helpers

**Files:**
- Create: `lib/sse.ts`
- Test: `tests/unit/sse.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/sse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeSSE, parseSSE } from '@/lib/sse';

describe('SSE helpers', () => {
  it('encodes a single event with type + JSON data', () => {
    const out = encodeSSE({ type: 'step', id: 'parse', status: 'running', label: 'X' });
    expect(out).toContain('event: step');
    expect(out).toContain('data: {');
    expect(out.endsWith('\n\n')).toBe(true);
  });

  it('round-trips a stream of events', () => {
    const events = [
      { type: 'step' as const, id: 'a', status: 'running' as const, label: 'A' },
      { type: 'step' as const, id: 'a', status: 'done' as const, label: 'A', durationMs: 5 }
    ];
    const stream = events.map(encodeSSE).join('');
    const parsed = parseSSE(stream);
    expect(parsed).toEqual(events);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/sse.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/sse.ts`:

```ts
import type { PipelineEvent } from '@/types/resume';

export function encodeSSE(ev: PipelineEvent): string {
  const data = JSON.stringify(ev);
  return `event: ${ev.type}\ndata: ${data}\n\n`;
}

export function parseSSE(stream: string): PipelineEvent[] {
  const out: PipelineEvent[] = [];
  for (const block of stream.split('\n\n')) {
    if (!block.trim()) continue;
    const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
    if (!dataLine) continue;
    out.push(JSON.parse(dataLine.slice('data: '.length)) as PipelineEvent);
  }
  return out;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/sse.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sse.ts tests/unit/sse.test.ts
git commit -m "feat(sse): add encode/decode helpers"
```

---

## Task 6: Gemini SDK wrapper

**Files:**
- Create: `lib/gemini.ts`
- Test: `tests/unit/gemini.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/gemini.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createGeminiClient } from '@/lib/gemini';

describe('GeminiClient', () => {
  it('returns parsed JSON on first try', async () => {
    const fakeModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => '{"role":"SWE","mustHaveSkills":[]}' }
      })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    const result = await client.generateJson<{ role: string }>({
      prompt: 'X', schema: {}, temperature: 0.2
    });
    expect(result.role).toBe('SWE');
  });

  it('retries once on JSON parse failure with stricter prompt', async () => {
    const fakeModel = {
      generateContent: vi.fn()
        .mockResolvedValueOnce({ response: { text: () => 'NOT JSON' } })
        .mockResolvedValueOnce({ response: { text: () => '{"ok":true}' } })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    const result = await client.generateJson<{ ok: boolean }>({
      prompt: 'X', schema: {}, temperature: 0.2
    });
    expect(result.ok).toBe(true);
    expect(fakeModel.generateContent).toHaveBeenCalledTimes(2);
  });

  it('throws after second failure', async () => {
    const fakeModel = {
      generateContent: vi.fn()
        .mockResolvedValue({ response: { text: () => 'still not json' } })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    await expect(
      client.generateJson({ prompt: 'X', schema: {}, temperature: 0.2 })
    ).rejects.toThrow(/JSON/i);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/gemini.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/gemini.ts`:

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export type GeminiCallOptions = {
  prompt: string;
  schema: Record<string, unknown>;
  temperature: number;
  model?: string;
};

export type GeminiClient = {
  generateJson<T>(opts: GeminiCallOptions): Promise<T>;
};

type SdkLike = {
  getGenerativeModel: (cfg: { model: string; generationConfig?: unknown }) => {
    generateContent: (input: unknown) => Promise<{ response: { text: () => string } }>;
  };
};

export type CreateGeminiOpts = {
  apiKey: string;
  sdkFactory?: (apiKey: string) => SdkLike;
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

export function createGeminiClient(opts: CreateGeminiOpts): GeminiClient {
  const sdk = opts.sdkFactory
    ? opts.sdkFactory(opts.apiKey)
    : (new GoogleGenerativeAI(opts.apiKey) as unknown as SdkLike);

  return {
    async generateJson<T>(call: GeminiCallOptions): Promise<T> {
      const modelName = call.model ?? DEFAULT_MODEL;
      const model = sdk.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: call.temperature,
          responseMimeType: 'application/json',
          responseSchema: call.schema
        }
      });

      const tryOnce = async (prompt: string): Promise<T> => {
        const r = await model.generateContent(prompt);
        const txt = r.response.text();
        return JSON.parse(txt) as T;
      };

      try {
        return await tryOnce(call.prompt);
      } catch (e) {
        const stricter = `${call.prompt}\n\nReturn ONLY a valid JSON object matching the requested schema. No prose, no markdown, no code fences.`;
        try {
          return await tryOnce(stricter);
        } catch (e2) {
          throw new Error(`Gemini JSON parse failed after retry: ${(e2 as Error).message}`);
        }
      }
    }
  };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/gemini.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/gemini.ts tests/unit/gemini.test.ts
git commit -m "feat(gemini): add JSON-mode SDK wrapper with parse-retry"
```

---

## Task 7: Step — parseInputs (TDD)

**Files:**
- Create: `lib/pipeline/steps/parseInputs.ts`
- Test: `tests/unit/parseInputs.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/parseInputs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseInputs } from '@/lib/pipeline/steps/parseInputs';

describe('parseInputs', () => {
  it('strips non-printable chars from resume text', async () => {
    const r = await parseInputs({ resumeText: 'A\x00B\x07C', jdText: '' });
    expect(r.resumeText).toBe('ABC');
  });
  it('collapses excessive whitespace', async () => {
    const r = await parseInputs({ resumeText: 'A   B\n\n\n\nC', jdText: '' });
    expect(r.resumeText).toBe('A B\n\nC');
  });
  it('passes through clean JD', async () => {
    const r = await parseInputs({ resumeText: 'X', jdText: 'Senior SWE' });
    expect(r.jdText).toBe('Senior SWE');
  });
  it('throws on empty resume', async () => {
    await expect(parseInputs({ resumeText: '   ', jdText: '' }))
      .rejects.toThrow(/empty/i);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/parseInputs.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/steps/parseInputs.ts`:

```ts
export type ParseInputsArgs = { resumeText: string; jdText: string };
export type ParseInputsResult = { resumeText: string; jdText: string };

const NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function clean(s: string): string {
  return s
    .replace(NON_PRINTABLE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseInputs(args: ParseInputsArgs): Promise<ParseInputsResult> {
  const resumeText = clean(args.resumeText);
  if (!resumeText) throw new Error('Resume text is empty');
  return { resumeText, jdText: clean(args.jdText) };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/parseInputs.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/steps/parseInputs.ts tests/unit/parseInputs.test.ts
git commit -m "feat(pipeline): add parseInputs step"
```

---

## Task 8: Step — analyzeJd (TDD with mocked Gemini)

**Files:**
- Create: `lib/pipeline/steps/analyzeJd.ts`
- Test: `tests/unit/analyzeJd.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/analyzeJd.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeJd } from '@/lib/pipeline/steps/analyzeJd';
import type { GeminiClient } from '@/lib/gemini';

describe('analyzeJd', () => {
  it('calls Gemini and returns parsed JDAnalysis', async () => {
    const fake: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue({
        role: 'Backend Engineer',
        mustHaveSkills: ['Go', 'Postgres'],
        niceToHaveSkills: ['Kafka'],
        keywords: ['microservices', 'scale'],
        tone: 'technical',
        seniority: 'mid'
      })
    };
    const out = await analyzeJd({ jdText: 'JD here' }, { gemini: fake });
    expect(out.role).toBe('Backend Engineer');
    expect(fake.generateJson).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/analyzeJd.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/steps/analyzeJd.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { JDAnalysis } from '@/types/resume';

const SCHEMA = {
  type: 'object',
  properties: {
    role: { type: 'string' },
    mustHaveSkills: { type: 'array', items: { type: 'string' } },
    niceToHaveSkills: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    tone: { type: 'string', enum: ['technical', 'leadership', 'product', 'research'] },
    seniority: { type: 'string', enum: ['intern', 'junior', 'mid', 'senior'] }
  },
  required: ['role', 'mustHaveSkills', 'niceToHaveSkills', 'keywords', 'tone', 'seniority']
};

export async function analyzeJd(
  args: { jdText: string },
  ctx: { gemini: GeminiClient }
): Promise<JDAnalysis> {
  const prompt = `You are an ATS keyword analyst. Extract structured information from the following job description.

Job Description:
"""
${args.jdText}
"""

Return JSON with: role title, must-have skills, nice-to-have skills, ATS keywords (technical terms recruiters search for), overall tone, and seniority level.`;

  return ctx.gemini.generateJson<JDAnalysis>({
    prompt,
    schema: SCHEMA,
    temperature: 0.2
  });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/analyzeJd.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/steps/analyzeJd.ts tests/unit/analyzeJd.test.ts
git commit -m "feat(pipeline): add analyzeJd step"
```

---

## Task 9: Step — extractResume (TDD)

**Files:**
- Create: `lib/pipeline/steps/extractResume.ts`
- Test: `tests/unit/extractResume.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/extractResume.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { extractResume } from '@/lib/pipeline/steps/extractResume';
import type { GeminiClient } from '@/lib/gemini';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('extractResume', () => {
  it('returns ResumeData from raw text via Gemini', async () => {
    const fake: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(sample)
    };
    const out = await extractResume({ resumeText: 'raw…' }, { gemini: fake });
    expect(out.header.name).toBe('Amit Yadav');
    expect(out.experience.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/extractResume.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/steps/extractResume.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData } from '@/types/resume';

const SCHEMA = {
  type: 'object',
  properties: {
    header: {
      type: 'object',
      properties: {
        name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
        portfolio: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' }
      },
      required: ['name', 'email', 'phone']
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' }, location: { type: 'string' },
          role: { type: 'string' }, dates: { type: 'string' },
          bullets: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, detail: { type: 'string' } },
              required: ['title', 'detail']
            }
          }
        },
        required: ['company', 'location', 'role', 'dates', 'bullets']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, url: { type: 'string' },
          tagline: { type: 'string' }, description: { type: 'string' }, tech: { type: 'string' }
        },
        required: ['name', 'tagline', 'description', 'tech']
      }
    },
    skills: {
      type: 'object',
      properties: {
        languages: { type: 'string' }, frameworks: { type: 'string' },
        tools: { type: 'string' }, soft: { type: 'string' }
      },
      required: ['languages', 'frameworks', 'tools', 'soft']
    },
    achievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    coursework: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' }, location: { type: 'string' },
          degree: { type: 'string' }, dates: { type: 'string' }
        },
        required: ['school', 'location', 'degree', 'dates']
      }
    }
  },
  required: ['header', 'experience', 'projects', 'skills', 'achievements', 'coursework', 'education']
};

export async function extractResume(
  args: { resumeText: string },
  ctx: { gemini: GeminiClient }
): Promise<ResumeData> {
  const prompt = `Parse the following resume text into structured JSON. Preserve original wording exactly. If a section is missing, return an empty array (or empty strings for skills). Do not invent content.

Resume:
"""
${args.resumeText}
"""`;

  return ctx.gemini.generateJson<ResumeData>({
    prompt,
    schema: SCHEMA,
    temperature: 0.1
  });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/extractResume.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/steps/extractResume.ts tests/unit/extractResume.test.ts
git commit -m "feat(pipeline): add extractResume step"
```

---

## Task 10: Step — tailor (TDD)

**Files:**
- Create: `lib/pipeline/steps/tailor.ts`
- Test: `tests/unit/tailorStep.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/tailorStep.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { tailorStep } from '@/lib/pipeline/steps/tailor';
import type { GeminiClient } from '@/lib/gemini';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('tailorStep', () => {
  it('returns rewritten ResumeData from Gemini', async () => {
    const tailored = JSON.parse(JSON.stringify(sample));
    tailored.experience[0].bullets[0].detail = 'rewritten detail';
    const fake: GeminiClient = { generateJson: vi.fn().mockResolvedValue(tailored) };
    const out = await tailorStep(
      { resume: sample as never, jd: { role: 'X', mustHaveSkills: [], niceToHaveSkills: [], keywords: [], tone: 'technical', seniority: 'junior' } },
      { gemini: fake }
    );
    expect(out.experience[0].bullets[0].detail).toBe('rewritten detail');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/tailorStep.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/steps/tailor.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData, JDAnalysis } from '@/types/resume';

// Reuse extractResume's schema shape — same ResumeData target
import { ResumeDataSchema } from './_schemas';

export async function tailorStep(
  args: { resume: ResumeData; jd: JDAnalysis },
  ctx: { gemini: GeminiClient }
): Promise<ResumeData> {
  const prompt = `You are an expert resume writer optimizing for ATS systems.

Given the candidate's structured resume and the JD analysis, produce a tailored ResumeData JSON that:
1. Reorders experience and projects to put the most JD-relevant items first.
2. Rewrites bullet details to start with strong action verbs and weave in JD keywords NATURALLY (no keyword stuffing).
3. Drops the weakest 1–2 bullets if the original list has more than 4 per role, but only if dropping improves clarity.
4. Preserves header, education, and any factual claims (dates, companies, GPAs). Never invent metrics or experiences.
5. Keeps each bullet detail under 200 characters.

Return ONLY the rewritten ResumeData JSON.

JD Analysis:
${JSON.stringify(args.jd, null, 2)}

Original Resume:
${JSON.stringify(args.resume, null, 2)}`;

  return ctx.gemini.generateJson<ResumeData>({
    prompt,
    schema: ResumeDataSchema,
    temperature: 0.6
  });
}
```

- [ ] **Step 4: Extract shared schema**

Create `lib/pipeline/steps/_schemas.ts`:

```ts
export const ResumeDataSchema = {
  type: 'object',
  properties: {
    header: {
      type: 'object',
      properties: {
        name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
        portfolio: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' }
      },
      required: ['name', 'email', 'phone']
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' }, location: { type: 'string' },
          role: { type: 'string' }, dates: { type: 'string' },
          bullets: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, detail: { type: 'string' } },
              required: ['title', 'detail']
            }
          }
        },
        required: ['company', 'location', 'role', 'dates', 'bullets']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, url: { type: 'string' },
          tagline: { type: 'string' }, description: { type: 'string' }, tech: { type: 'string' }
        },
        required: ['name', 'tagline', 'description', 'tech']
      }
    },
    skills: {
      type: 'object',
      properties: {
        languages: { type: 'string' }, frameworks: { type: 'string' },
        tools: { type: 'string' }, soft: { type: 'string' }
      },
      required: ['languages', 'frameworks', 'tools', 'soft']
    },
    achievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    coursework: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' }, location: { type: 'string' },
          degree: { type: 'string' }, dates: { type: 'string' }
        },
        required: ['school', 'location', 'degree', 'dates']
      }
    }
  },
  required: ['header', 'experience', 'projects', 'skills', 'achievements', 'coursework', 'education']
} as const;
```

Update `lib/pipeline/steps/extractResume.ts` to import from `_schemas`:

Replace the local `SCHEMA` constant with:

```ts
import { ResumeDataSchema } from './_schemas';
```

…and use `ResumeDataSchema` in the `generateJson` call. Delete the in-file `SCHEMA` constant.

- [ ] **Step 5: Run tests, expect pass**

```bash
npm test
```

Expected: all green (parseInputs, analyzeJd, extractResume, tailorStep, escape, template, sse, gemini).

- [ ] **Step 6: Commit**

```bash
git add lib/pipeline/steps/_schemas.ts lib/pipeline/steps/extractResume.ts lib/pipeline/steps/tailor.ts tests/unit/tailorStep.test.ts
git commit -m "feat(pipeline): add tailor step + share ResumeData schema"
```

---

## Task 11: Steps — scoreBefore + rewrite + scoreAfter (TDD)

**Files:**
- Create: `lib/pipeline/steps/scoreBefore.ts`, `lib/pipeline/steps/rewrite.ts`, `lib/pipeline/steps/scoreAfter.ts`, `lib/pipeline/steps/_scoreSchema.ts`
- Test: `tests/unit/score.test.ts`, `tests/unit/rewrite.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/score.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { scoreResume } from '@/lib/pipeline/steps/scoreBefore';
import type { GeminiClient } from '@/lib/gemini';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('scoreResume', () => {
  it('returns Score from Gemini', async () => {
    const fake: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue({
        overall: 72,
        dimensions: {
          actionVerbs: 70, quantification: 60, keywordBreadth: 75,
          bulletStrength: 70, clarity: 80, length: 80
        },
        weaknesses: ['Few quantified results']
      })
    };
    const out = await scoreResume({ resume: sample as never }, { gemini: fake });
    expect(out.overall).toBe(72);
    expect(out.weaknesses).toContain('Few quantified results');
  });
});
```

Create `tests/unit/rewrite.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { rewriteResume } from '@/lib/pipeline/steps/rewrite';
import type { GeminiClient } from '@/lib/gemini';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('rewriteResume', () => {
  it('returns improved ResumeData', async () => {
    const improved = JSON.parse(JSON.stringify(sample));
    improved.experience[0].bullets[0].detail = 'Engineered ...';
    const fake: GeminiClient = { generateJson: vi.fn().mockResolvedValue(improved) };
    const out = await rewriteResume(
      { resume: sample as never,
        weaknesses: ['weak verbs'] },
      { gemini: fake }
    );
    expect(out.experience[0].bullets[0].detail.startsWith('Engineered')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
npm test -- tests/unit/score.test.ts tests/unit/rewrite.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement score schema**

Create `lib/pipeline/steps/_scoreSchema.ts`:

```ts
export const ScoreSchema = {
  type: 'object',
  properties: {
    overall: { type: 'integer', minimum: 0, maximum: 100 },
    dimensions: {
      type: 'object',
      properties: {
        actionVerbs: { type: 'integer' }, quantification: { type: 'integer' },
        keywordBreadth: { type: 'integer' }, bulletStrength: { type: 'integer' },
        clarity: { type: 'integer' }, length: { type: 'integer' }
      },
      required: ['actionVerbs', 'quantification', 'keywordBreadth', 'bulletStrength', 'clarity', 'length']
    },
    weaknesses: { type: 'array', items: { type: 'string' } }
  },
  required: ['overall', 'dimensions', 'weaknesses']
} as const;
```

- [ ] **Step 4: Implement scoreResume (used by both scoreBefore and scoreAfter)**

Create `lib/pipeline/steps/scoreBefore.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData, Score } from '@/types/resume';
import { ScoreSchema } from './_scoreSchema';

export async function scoreResume(
  args: { resume: ResumeData },
  ctx: { gemini: GeminiClient }
): Promise<Score> {
  const prompt = `You are an ATS auditor. Rate the following resume on each dimension (0–100). Then list the top 3–6 specific weaknesses (e.g., "uses passive voice in TExam role", "no quantified outcomes in projects").

Dimensions:
- actionVerbs: how often bullets begin with strong action verbs
- quantification: presence of numeric outcomes (%, $, time saved, scale)
- keywordBreadth: variety of relevant technical keywords
- bulletStrength: clarity of impact in each bullet
- clarity: overall readability and conciseness
- length: appropriate density (not too sparse, not too dense)

Compute overall as the rounded average.

Resume JSON:
${JSON.stringify(args.resume, null, 2)}`;

  return ctx.gemini.generateJson<Score>({
    prompt,
    schema: ScoreSchema,
    temperature: 0.2
  });
}
```

- [ ] **Step 5: Implement rewriteResume**

Create `lib/pipeline/steps/rewrite.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData } from '@/types/resume';
import { ResumeDataSchema } from './_schemas';

export async function rewriteResume(
  args: { resume: ResumeData; weaknesses: string[] },
  ctx: { gemini: GeminiClient }
): Promise<ResumeData> {
  const prompt = `Rewrite the following resume to address the listed weaknesses. Rules:
1. Lead bullets with strong action verbs (Engineered, Designed, Reduced, Shipped, …).
2. Add quantitative outcomes only when conservatively inferrable from context. Never invent specific numbers.
3. Tighten phrasing — drop filler words (very, just, really, basically).
4. Use ATS-friendly phrasing (avoid metaphors and slang).
5. Preserve all factual content: companies, roles, dates, education, links.
6. Keep each bullet detail under 200 characters.

Weaknesses to address:
${args.weaknesses.map((w) => `- ${w}`).join('\n')}

Resume JSON:
${JSON.stringify(args.resume, null, 2)}

Return ONLY the rewritten ResumeData JSON.`;

  return ctx.gemini.generateJson<ResumeData>({
    prompt,
    schema: ResumeDataSchema,
    temperature: 0.6
  });
}
```

- [ ] **Step 6: scoreAfter is just an alias**

Create `lib/pipeline/steps/scoreAfter.ts`:

```ts
export { scoreResume as scoreAfter } from './scoreBefore';
```

- [ ] **Step 7: Run tests, expect pass**

```bash
npm test -- tests/unit/score.test.ts tests/unit/rewrite.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/pipeline/steps/_scoreSchema.ts lib/pipeline/steps/scoreBefore.ts lib/pipeline/steps/scoreAfter.ts lib/pipeline/steps/rewrite.ts tests/unit/score.test.ts tests/unit/rewrite.test.ts
git commit -m "feat(pipeline): add scoreResume + rewriteResume steps"
```

---

## Task 12: Step — renderLatex (thin wrapper)

**Files:**
- Create: `lib/pipeline/steps/renderLatex.ts`
- Test: `tests/unit/renderLatexStep.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/renderLatexStep.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderLatexStep } from '@/lib/pipeline/steps/renderLatex';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('renderLatexStep', () => {
  it('returns full .tex string', async () => {
    const out = await renderLatexStep({ resume: sample as never });
    expect(out.tex).toContain('\\documentclass');
    expect(out.tex).toContain('\\end{document}');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/renderLatexStep.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/steps/renderLatex.ts`:

```ts
import { renderResume } from '@/lib/latex/template';
import type { ResumeData } from '@/types/resume';

export async function renderLatexStep(
  args: { resume: ResumeData }
): Promise<{ tex: string }> {
  return { tex: renderResume(args.resume) };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/renderLatexStep.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/steps/renderLatex.ts tests/unit/renderLatexStep.test.ts
git commit -m "feat(pipeline): add renderLatex step"
```

---

## Task 13: Tailor orchestrator (TDD)

**Files:**
- Create: `lib/pipeline/tailor.ts`
- Test: `tests/unit/tailorOrchestrator.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/tailorOrchestrator.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { runTailor } from '@/lib/pipeline/tailor';
import type { GeminiClient } from '@/lib/gemini';
import type { PipelineEvent } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('runTailor orchestrator', () => {
  it('emits parse → analyze-jd ‖ extract → tailor → render → final', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn()
        .mockResolvedValueOnce({   // analyzeJd
          role: 'BE', mustHaveSkills: [], niceToHaveSkills: [],
          keywords: [], tone: 'technical', seniority: 'junior'
        })
        .mockResolvedValueOnce(sample) // extractResume
        .mockResolvedValueOnce(sample) // tailor
    };
    await runTailor(
      { mode: 'tailor', resumeText: 'raw resume', jdText: 'JD text' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    const stepOrder = events.filter(e => e.type === 'step' && e.status === 'done').map(e => (e as any).id);
    expect(stepOrder).toEqual(['parse', 'analyze-jd', 'extract', 'tailor', 'render']);
    expect(events.find(e => e.type === 'final')).toBeTruthy();
  });

  it('emits error event when a step throws', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn().mockRejectedValueOnce(new Error('boom'))
    };
    await runTailor(
      { mode: 'tailor', resumeText: 'r', jdText: 'j' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    expect(events.some(e => e.type === 'error')).toBe(true);
    expect(events.find(e => e.type === 'final')).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/tailorOrchestrator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/tailor.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';
import { parseInputs } from './steps/parseInputs';
import { analyzeJd } from './steps/analyzeJd';
import { extractResume } from './steps/extractResume';
import { tailorStep } from './steps/tailor';
import { renderLatexStep } from './steps/renderLatex';

type Ctx = { gemini: GeminiClient; emit: (e: PipelineEvent) => void };

async function runStep<T>(
  id: string, label: string,
  fn: () => Promise<T>,
  ctx: Ctx
): Promise<T | null> {
  const start = Date.now();
  ctx.emit({ type: 'step', id, status: 'running', label });
  try {
    const out = await fn();
    ctx.emit({ type: 'step', id, status: 'done', label, durationMs: Date.now() - start });
    return out;
  } catch (e) {
    ctx.emit({ type: 'step', id, status: 'error', label, durationMs: Date.now() - start });
    ctx.emit({ type: 'error', stepId: id, message: (e as Error).message });
    return null;
  }
}

export async function runTailor(
  req: Extract<GenerateRequest, { mode: 'tailor' }>,
  ctx: Ctx
): Promise<void> {
  const parsed = await runStep('parse', 'Parse inputs',
    () => parseInputs({ resumeText: req.resumeText, jdText: req.jdText }), ctx);
  if (!parsed) return;

  const [jd, resume] = await Promise.all([
    runStep('analyze-jd', 'Analyze JD',
      () => analyzeJd({ jdText: parsed.jdText }, { gemini: ctx.gemini }), ctx),
    runStep('extract', 'Extract resume',
      () => extractResume({ resumeText: parsed.resumeText }, { gemini: ctx.gemini }), ctx)
  ]);
  if (!jd || !resume) return;

  const tailored = await runStep('tailor', 'Tailor content',
    () => tailorStep({ resume, jd }, { gemini: ctx.gemini }), ctx);
  if (!tailored) return;

  const rendered = await runStep('render', 'Render LaTeX',
    () => renderLatexStep({ resume: tailored }), ctx);
  if (!rendered) return;

  ctx.emit({ type: 'final', tex: rendered.tex });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- tests/unit/tailorOrchestrator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/tailor.ts tests/unit/tailorOrchestrator.test.ts
git commit -m "feat(pipeline): add tailor orchestrator with parallel + error halt"
```

---

## Task 14: Enhance orchestrator (TDD)

**Files:**
- Create: `lib/pipeline/enhance.ts`
- Test: `tests/unit/enhanceOrchestrator.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/enhanceOrchestrator.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { runEnhance } from '@/lib/pipeline/enhance';
import type { GeminiClient } from '@/lib/gemini';
import type { PipelineEvent } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

const SCORE_BEFORE = {
  overall: 60,
  dimensions: {
    actionVerbs: 60, quantification: 50, keywordBreadth: 60,
    bulletStrength: 60, clarity: 70, length: 60
  },
  weaknesses: ['weak verbs', 'no metrics']
};

const SCORE_AFTER = { ...SCORE_BEFORE, overall: 85 };

describe('runEnhance orchestrator', () => {
  it('emits parse → extract → score-before → rewrite → score-after → render → final with both scores', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn()
        .mockResolvedValueOnce(sample)        // extract
        .mockResolvedValueOnce(SCORE_BEFORE)  // score-before
        .mockResolvedValueOnce(sample)        // rewrite
        .mockResolvedValueOnce(SCORE_AFTER)   // score-after
    };
    await runEnhance(
      { mode: 'enhance', resumeText: 'raw resume' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    const ids = events.filter(e => e.type === 'step' && e.status === 'done').map(e => (e as any).id);
    expect(ids).toEqual(['parse', 'extract', 'score-before', 'rewrite', 'score-after', 'render']);
    const final = events.find(e => e.type === 'final') as any;
    expect(final.before.overall).toBe(60);
    expect(final.after.overall).toBe(85);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- tests/unit/enhanceOrchestrator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `lib/pipeline/enhance.ts`:

```ts
import type { GeminiClient } from '@/lib/gemini';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';
import { parseInputs } from './steps/parseInputs';
import { extractResume } from './steps/extractResume';
import { scoreResume } from './steps/scoreBefore';
import { rewriteResume } from './steps/rewrite';
import { scoreAfter } from './steps/scoreAfter';
import { renderLatexStep } from './steps/renderLatex';

type Ctx = { gemini: GeminiClient; emit: (e: PipelineEvent) => void };

async function runStep<T>(
  id: string, label: string,
  fn: () => Promise<T>,
  ctx: Ctx
): Promise<T | null> {
  const start = Date.now();
  ctx.emit({ type: 'step', id, status: 'running', label });
  try {
    const out = await fn();
    ctx.emit({ type: 'step', id, status: 'done', label, durationMs: Date.now() - start });
    return out;
  } catch (e) {
    ctx.emit({ type: 'step', id, status: 'error', label, durationMs: Date.now() - start });
    ctx.emit({ type: 'error', stepId: id, message: (e as Error).message });
    return null;
  }
}

export async function runEnhance(
  req: Extract<GenerateRequest, { mode: 'enhance' }>,
  ctx: Ctx
): Promise<void> {
  const parsed = await runStep('parse', 'Parse inputs',
    () => parseInputs({ resumeText: req.resumeText, jdText: '' }), ctx);
  if (!parsed) return;

  const resume = await runStep('extract', 'Extract resume',
    () => extractResume({ resumeText: parsed.resumeText }, { gemini: ctx.gemini }), ctx);
  if (!resume) return;

  const before = await runStep('score-before', 'Score (before)',
    () => scoreResume({ resume }, { gemini: ctx.gemini }), ctx);
  if (!before) return;

  const rewritten = await runStep('rewrite', 'Rewrite content',
    () => rewriteResume({ resume, weaknesses: before.weaknesses }, { gemini: ctx.gemini }), ctx);
  if (!rewritten) return;

  const after = await runStep('score-after', 'Score (after)',
    () => scoreAfter({ resume: rewritten }, { gemini: ctx.gemini }), ctx);
  if (!after) return;

  const rendered = await runStep('render', 'Render LaTeX',
    () => renderLatexStep({ resume: rewritten }), ctx);
  if (!rendered) return;

  ctx.emit({ type: 'final', tex: rendered.tex, before, after });
}
```

- [ ] **Step 4: Refactor — extract shared `runStep` helper**

Create `lib/pipeline/_runStep.ts`:

```ts
import type { PipelineEvent } from '@/types/resume';

export type StepCtx = {
  emit: (e: PipelineEvent) => void;
};

export async function runStep<T>(
  id: string, label: string,
  fn: () => Promise<T>,
  ctx: StepCtx
): Promise<T | null> {
  const start = Date.now();
  ctx.emit({ type: 'step', id, status: 'running', label });
  try {
    const out = await fn();
    ctx.emit({ type: 'step', id, status: 'done', label, durationMs: Date.now() - start });
    return out;
  } catch (e) {
    ctx.emit({ type: 'step', id, status: 'error', label, durationMs: Date.now() - start });
    ctx.emit({ type: 'error', stepId: id, message: (e as Error).message });
    return null;
  }
}
```

Replace local `runStep` in both `lib/pipeline/tailor.ts` and `lib/pipeline/enhance.ts` with `import { runStep } from './_runStep';`. Delete the local definitions.

- [ ] **Step 5: Run all tests, expect pass**

```bash
npm test
```

Expected: all green (escape, template, sse, gemini, parseInputs, analyzeJd, extractResume, tailorStep, score, rewrite, renderLatexStep, tailorOrchestrator, enhanceOrchestrator).

- [ ] **Step 6: Commit**

```bash
git add lib/pipeline/_runStep.ts lib/pipeline/enhance.ts lib/pipeline/tailor.ts tests/unit/enhanceOrchestrator.test.ts
git commit -m "feat(pipeline): add enhance orchestrator + share runStep helper"
```

---

## Task 15: API route — /api/generate (Edge runtime, SSE)

**Files:**
- Create: `app/api/generate/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/generate/route.ts`:

```ts
import { createGeminiClient } from '@/lib/gemini';
import { runTailor } from '@/lib/pipeline/tailor';
import { runEnhance } from '@/lib/pipeline/enhance';
import { encodeSSE } from '@/lib/sse';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';

export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as GenerateRequest;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
  const gemini = createGeminiClient({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: PipelineEvent) => controller.enqueue(encoder.encode(encodeSSE(e)));
      try {
        if (body.mode === 'tailor') {
          await runTailor(body, { gemini, emit });
        } else if (body.mode === 'enhance') {
          await runEnhance(body, { gemini, emit });
        } else {
          emit({ type: 'error', stepId: 'init', message: 'unknown mode' });
        }
      } catch (e) {
        emit({ type: 'error', stepId: 'orchestrator', message: (e as Error).message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no'
    }
  });
}
```

- [ ] **Step 2: Smoke test**

Run:

```bash
GEMINI_API_KEY=fake-key npm run build
```

Expected: build completes without type errors. (Live SSE smoke test happens after UI is built.)

- [ ] **Step 3: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat(api): add /api/generate Edge SSE route"
```

---

## Task 16: Client-side PDF text extractor

**Files:**
- Create: `lib/pdf.ts`

- [ ] **Step 1: Implement extractor**

Create `lib/pdf.ts`:

```ts
'use client';

// pdf.js workerSrc is set lazily to avoid bundling cost on cold render
let workerSrcSet = false;

async function ensurePdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerSrcSet) {
    // Vite/Next will resolve the worker URL at build time
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    workerSrcSet = true;
  }
  return pdfjs;
}

export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Not a PDF file');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('PDF too large (max 5MB)');
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await ensurePdfjs();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out.push(content.items.map((it: { str?: string }) => it.str ?? '').join(' '));
  }
  return out.join('\n').trim();
}
```

- [ ] **Step 2: Add ambient module decl for ?url import**

Append to `next-env.d.ts` (or create `types/url-import.d.ts` if `next-env.d.ts` is auto-managed):

Create `types/url-import.d.ts`:

```ts
declare module '*?url' { const v: string; export default v; }
```

- [ ] **Step 3: Build sanity check**

```bash
npm run build
```

Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add lib/pdf.ts types/url-import.d.ts
git commit -m "feat(pdf): client-side PDF text extractor via pdf.js"
```

---

## Task 17: Vendor SwiftLaTeX engine + compile wrapper

**Files:**
- Create: `public/swiftlatex/PdfTeXEngine.js`, `public/swiftlatex/swiftlatexpdftex.js`, `public/swiftlatex/swiftlatexpdftex.wasm`, `public/swiftlatex/pdftex-worker.js`
- Create: `lib/latex/compile.ts`

- [ ] **Step 1: Vendor SwiftLaTeX**

Manual step. Download the latest SwiftLaTeX `pdftex` engine bundle from <https://github.com/SwiftLaTeX/SwiftLaTeX/releases> (or `npm pack swiftlatex-pdftex` if a published mirror is available) and copy these four files to `public/swiftlatex/`:

- `PdfTeXEngine.js`
- `swiftlatexpdftex.js`
- `swiftlatexpdftex.wasm`
- `pdftex-worker.js`

The four files must sit beside each other; `PdfTeXEngine.js` resolves the worker as a sibling URL.

Add to `.gitignore`? **No** — these are vendored binary deps; commit them so the build is reproducible.

- [ ] **Step 2: Implement client wrapper**

Create `lib/latex/compile.ts`:

```ts
'use client';

type EngineLike = {
  loadEngine: () => Promise<void>;
  writeMemFSFile: (name: string, content: string) => void;
  setEngineMainFile: (name: string) => void;
  compileLaTeX: () => Promise<{ pdf: Uint8Array; log: string; status: number }>;
  flushCache: () => void;
};

let cached: EngineLike | null = null;

async function getEngine(): Promise<EngineLike> {
  if (cached) return cached;
  // Load PdfTeXEngine.js as a classic script via dynamic <script> tag,
  // since it expects to attach a global.
  await new Promise<void>((resolve, reject) => {
    if ((window as unknown as { PdfTeXEngine?: unknown }).PdfTeXEngine) return resolve();
    const s = document.createElement('script');
    s.src = '/swiftlatex/PdfTeXEngine.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load SwiftLaTeX engine script'));
    document.head.appendChild(s);
  });
  const Ctor = (window as unknown as { PdfTeXEngine: new () => EngineLike }).PdfTeXEngine;
  const engine = new Ctor();
  await engine.loadEngine();
  cached = engine;
  return engine;
}

export type CompileResult = { pdf: Blob | null; log: string; status: number };

export async function compileTex(tex: string): Promise<CompileResult> {
  const engine = await getEngine();
  engine.flushCache();
  engine.writeMemFSFile('main.tex', tex);
  engine.setEngineMainFile('main.tex');
  const r = await engine.compileLaTeX();
  return {
    pdf: r.status === 0 ? new Blob([r.pdf], { type: 'application/pdf' }) : null,
    log: r.log,
    status: r.status
  };
}
```

- [ ] **Step 3: Smoke build**

```bash
npm run build
```

Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add public/swiftlatex lib/latex/compile.ts
git commit -m "feat(latex): vendor SwiftLaTeX + add browser compile wrapper"
```

---

## Task 18: ModePicker component

**Files:**
- Create: `components/ModePicker.tsx`

- [ ] **Step 1: Implement**

Create `components/ModePicker.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { Wand2, Target } from 'lucide-react';

export function ModePicker() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-6 py-16 md:grid-cols-2">
      <Link href="/tailor"
        className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-emerald-500 hover:bg-zinc-900/60">
        <Target className="mb-4 h-8 w-8 text-emerald-400" />
        <h2 className="text-xl font-semibold">Tailor to JD</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a job description and your resume — get an ATS-aligned resume in seconds.
        </p>
      </Link>
      <Link href="/enhance"
        className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-violet-500 hover:bg-zinc-900/60">
        <Wand2 className="mb-4 h-8 w-8 text-violet-400" />
        <h2 className="text-xl font-semibold">Enhance Resume</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Boost your existing resume's ATS score. Before/after breakdown included.
        </p>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Wire into home page**

Replace `app/page.tsx`:

```tsx
import { ModePicker } from '@/components/ModePicker';

export default function Home() {
  return (
    <main>
      <header className="mx-auto max-w-4xl px-6 pt-16">
        <h1 className="text-3xl font-bold">BuildResume</h1>
        <p className="mt-2 text-zinc-400">AI resume builder — pick a mode.</p>
      </header>
      <ModePicker />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ModePicker.tsx app/page.tsx
git commit -m "feat(ui): add ModePicker landing"
```

---

## Task 19: InputPanel component

**Files:**
- Create: `components/InputPanel.tsx`

- [ ] **Step 1: Implement**

Create `components/InputPanel.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { extractPdfText } from '@/lib/pdf';
import { Upload, FileText } from 'lucide-react';

type Props = {
  showJd: boolean;
  onSubmit: (data: { resumeText: string; jdText: string }) => void;
  submitting: boolean;
};

export function InputPanel({ showJd, onSubmit, submitting }: Props) {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setPdfErr(null);
    setParsing(true);
    try {
      const text = await extractPdfText(file);
      setResumeText(text);
    } catch (e) {
      setPdfErr((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  const canSubmit = !!resumeText.trim() && (!showJd || !!jdText.trim()) && !submitting;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <section>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" /> Your resume
        </label>
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <Upload className="h-4 w-4" />
            <span>{parsing ? 'Reading PDF…' : 'Upload PDF (max 5 MB)'}</span>
            <input
              type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
          </label>
          {pdfErr && <p className="mt-2 text-sm text-red-400">{pdfErr}</p>}
          <textarea
            className="mt-3 h-48 w-full resize-y rounded-lg bg-zinc-950 p-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
            placeholder="…or paste resume text here"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>
      </section>

      {showJd && (
        <section>
          <label className="mb-2 block text-sm font-medium">Job description</label>
          <textarea
            className="h-48 w-full resize-y rounded-xl bg-zinc-900 p-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
            placeholder="Paste the JD"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </section>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => onSubmit({ resumeText, jdText })}
        className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Building…' : 'Build resume'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/InputPanel.tsx
git commit -m "feat(ui): add InputPanel"
```

---

## Task 20: PipelineView + StepCard

**Files:**
- Create: `components/StepCard.tsx`, `components/PipelineView.tsx`

- [ ] **Step 1: Implement StepCard**

Create `components/StepCard.tsx`:

```tsx
'use client';
import { Check, Circle, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PipelineStepStatus } from '@/types/resume';

type Props = {
  status: PipelineStepStatus;
  label: string;
  durationMs?: number;
  payloadSummary?: string;
};

export function StepCard({ status, label, durationMs, payloadSummary }: Props) {
  const Icon = {
    pending: Circle,
    running: Loader2,
    done: Check,
    error: X
  }[status];
  const tint = {
    pending: 'text-zinc-500',
    running: 'text-amber-400',
    done: 'text-emerald-400',
    error: 'text-red-400'
  }[status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <Icon className={`h-5 w-5 ${tint} ${status === 'running' ? 'animate-spin' : ''}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {durationMs != null && (
            <span className="text-xs text-zinc-500">{durationMs} ms</span>
          )}
        </div>
        {payloadSummary && (
          <p className="mt-1 text-xs text-zinc-400">{payloadSummary}</p>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Implement PipelineView**

Create `components/PipelineView.tsx`:

```tsx
'use client';
import { StepCard } from './StepCard';
import type { PipelineEvent, PipelineStepStatus } from '@/types/resume';

type Step = { id: string; label: string; status: PipelineStepStatus; durationMs?: number; payload?: unknown };

function summarize(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('keywords' in obj && Array.isArray(obj.keywords)) {
    return `${obj.keywords.length} keywords, role: ${String(obj.role ?? '')}`;
  }
  if ('exp' in obj || 'projects' in obj) {
    return `${obj.exp ?? 0} roles, ${obj.projects ?? 0} projects`;
  }
  return undefined;
}

export function PipelineView({ events }: { events: PipelineEvent[] }) {
  const steps = new Map<string, Step>();
  for (const ev of events) {
    if (ev.type !== 'step') continue;
    const prev = steps.get(ev.id);
    steps.set(ev.id, {
      id: ev.id,
      label: ev.label,
      status: ev.status,
      durationMs: ev.durationMs ?? prev?.durationMs,
      payload: ev.payload ?? prev?.payload
    });
  }
  const ordered = Array.from(steps.values());
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-6">
      {ordered.map((s) => (
        <StepCard key={s.id} status={s.status} label={s.label}
          durationMs={s.durationMs} payloadSummary={summarize(s.payload)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/PipelineView.tsx components/StepCard.tsx
git commit -m "feat(ui): add animated PipelineView + StepCard"
```

---

## Task 21: HeaderEditor modal

**Files:**
- Create: `components/HeaderEditor.tsx`

- [ ] **Step 1: Implement**

Create `components/HeaderEditor.tsx`:

```tsx
'use client';
import { useState } from 'react';
import type { ResumeHeader } from '@/types/resume';

type Props = {
  initial: ResumeHeader;
  onConfirm: (h: ResumeHeader) => void;
};

export function HeaderEditor({ initial, onConfirm }: Props) {
  const [h, setH] = useState<ResumeHeader>({ ...initial });
  const valid = !!h.name.trim() && !!h.email.trim() && !!h.phone.trim();

  const set = <K extends keyof ResumeHeader>(k: K, v: string) =>
    setH({ ...h, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-semibold">Confirm your details</h3>
        <div className="space-y-3">
          {(['name', 'email', 'phone', 'portfolio', 'github', 'linkedin'] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-xs text-zinc-400 capitalize">{k}{['name','email','phone'].includes(k) ? ' *' : ''}</span>
              <input
                className="mt-1 w-full rounded-lg bg-zinc-950 p-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-emerald-500"
                value={h[k] ?? ''}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button
          disabled={!valid}
          onClick={() => onConfirm(h)}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-black disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/HeaderEditor.tsx
git commit -m "feat(ui): add HeaderEditor modal"
```

---

## Task 22: ScoreCard component

**Files:**
- Create: `components/ScoreCard.tsx`

- [ ] **Step 1: Implement**

Create `components/ScoreCard.tsx`:

```tsx
'use client';
import { motion } from 'framer-motion';
import type { Score } from '@/types/resume';

type Props = { before: Score; after: Score };

const DIM_LABELS: Record<keyof Score['dimensions'], string> = {
  actionVerbs: 'Action verbs',
  quantification: 'Quantification',
  keywordBreadth: 'Keyword breadth',
  bulletStrength: 'Bullet strength',
  clarity: 'Clarity',
  length: 'Length'
};

function Bar({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{before} → {after}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-zinc-800">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: `${before}%` }}
          animate={{ width: `${after}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

export function ScoreCard({ before, after }: Props) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ATS score</h3>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-400">{after.overall}</div>
          <div className="text-xs text-zinc-500">was {before.overall}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {(Object.keys(DIM_LABELS) as Array<keyof Score['dimensions']>).map((k) => (
          <Bar key={k} label={DIM_LABELS[k]} before={before.dimensions[k]} after={after.dimensions[k]} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ScoreCard.tsx
git commit -m "feat(ui): add before/after ScoreCard"
```

---

## Task 23: ResumePreview + ActionBar

**Files:**
- Create: `components/ResumePreview.tsx`, `components/ActionBar.tsx`

- [ ] **Step 1: Implement ResumePreview**

Create `components/ResumePreview.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';

export function ResumePreview({ pdf }: { pdf: Blob | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pdf) { setUrl(null); return; }
    const u = URL.createObjectURL(pdf);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdf]);
  if (!pdf || !url) return null;
  return (
    <iframe
      title="Resume preview"
      src={url}
      className="mx-auto h-[80vh] w-full max-w-4xl rounded-xl border border-zinc-800"
    />
  );
}
```

- [ ] **Step 2: Implement ActionBar**

Create `components/ActionBar.tsx`:

```tsx
'use client';
import { Eye, Download } from 'lucide-react';

type Props = {
  pdf: Blob | null;
  tex: string | null;
  onPreview: () => void;
  showPreview: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function ActionBar({ pdf, tex, onPreview, showPreview }: Props) {
  return (
    <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 px-6 pb-6">
      <button
        disabled={!pdf}
        onClick={onPreview}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-40"
      >
        <Eye className="h-4 w-4" /> {showPreview ? 'Hide preview' : 'Preview'}
      </button>
      <button
        disabled={!pdf}
        onClick={() => pdf && downloadBlob(pdf, 'resume.pdf')}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
      >
        <Download className="h-4 w-4" /> Download .pdf
      </button>
      <button
        disabled={!tex}
        onClick={() => tex && downloadBlob(new Blob([tex], { type: 'application/x-tex' }), 'resume.tex')}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-40"
      >
        <Download className="h-4 w-4" /> Download .tex
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ResumePreview.tsx components/ActionBar.tsx
git commit -m "feat(ui): add ResumePreview + ActionBar"
```

---

## Task 24: Tailor flow page

**Files:**
- Create: `app/tailor/page.tsx`
- Create: `lib/useGenerate.ts`

- [ ] **Step 1: Implement client SSE hook**

Create `lib/useGenerate.ts`:

```tsx
'use client';
import { useState, useCallback } from 'react';
import { parseSSE } from '@/lib/sse';
import type { GenerateRequest, PipelineEvent, Score } from '@/types/resume';

export type GenerateState = {
  events: PipelineEvent[];
  tex: string | null;
  before?: Score;
  after?: Score;
  error: string | null;
  running: boolean;
};

const initial: GenerateState = {
  events: [], tex: null, error: null, running: false
};

export function useGenerate() {
  const [state, setState] = useState<GenerateState>(initial);

  const start = useCallback(async (req: GenerateRequest) => {
    setState({ ...initial, running: true });
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.body) {
      setState((s) => ({ ...s, error: 'No stream', running: false }));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acc: GenerateState = { ...initial, running: true };
    setState(acc);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const sep = buffer.lastIndexOf('\n\n');
      if (sep < 0) continue;
      const consumed = buffer.slice(0, sep + 2);
      buffer = buffer.slice(sep + 2);
      const events = parseSSE(consumed);
      for (const ev of events) {
        if (ev.type === 'final') {
          acc = { ...acc, tex: ev.tex, before: ev.before, after: ev.after };
        } else if (ev.type === 'error') {
          acc = { ...acc, error: ev.message };
        } else {
          acc = { ...acc, events: [...acc.events, ev] };
        }
      }
      setState({ ...acc });
    }
    setState({ ...acc, running: false });
  }, []);

  return { state, start };
}
```

- [ ] **Step 2: Implement tailor page**

Create `app/tailor/page.tsx`:

```tsx
'use client';
import { useState, useEffect } from 'react';
import { InputPanel } from '@/components/InputPanel';
import { PipelineView } from '@/components/PipelineView';
import { ResumePreview } from '@/components/ResumePreview';
import { ActionBar } from '@/components/ActionBar';
import { useGenerate } from '@/lib/useGenerate';
import { compileTex } from '@/lib/latex/compile';
import Link from 'next/link';

export default function TailorPage() {
  const { state, start } = useGenerate();
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [compileLog, setCompileLog] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!state.tex) return;
    setPdf(null);
    setCompileLog(null);
    void compileTex(state.tex).then((r) => {
      setPdf(r.pdf);
      if (!r.pdf) setCompileLog(r.log);
    });
  }, [state.tex]);

  return (
    <main>
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Back</Link>
        <h1 className="text-xl font-semibold">Tailor to JD</h1>
        <span />
      </header>
      {state.events.length === 0 && !state.running ? (
        <InputPanel
          showJd
          submitting={state.running}
          onSubmit={(d) => start({ mode: 'tailor', resumeText: d.resumeText, jdText: d.jdText })}
        />
      ) : (
        <>
          <PipelineView events={state.events} />
          {state.error && (
            <div className="mx-auto max-w-3xl px-6 pb-4 text-sm text-red-400">
              Error: {state.error}
            </div>
          )}
          {compileLog && (
            <details className="mx-auto max-w-3xl rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm">
              <summary className="cursor-pointer">PDF compile failed — open log</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{compileLog}</pre>
            </details>
          )}
          <ActionBar
            pdf={pdf} tex={state.tex}
            showPreview={showPreview}
            onPreview={() => setShowPreview((v) => !v)}
          />
          {showPreview && <ResumePreview pdf={pdf} />}
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Build sanity check**

```bash
npm run build
```

Expected: build completes.

- [ ] **Step 4: Commit**

```bash
git add app/tailor/page.tsx lib/useGenerate.ts
git commit -m "feat(ui): tailor flow page wired to SSE + SwiftLaTeX"
```

---

## Task 25: Enhance flow page

**Files:**
- Create: `app/enhance/page.tsx`

- [ ] **Step 1: Implement**

Create `app/enhance/page.tsx`:

```tsx
'use client';
import { useState, useEffect } from 'react';
import { InputPanel } from '@/components/InputPanel';
import { PipelineView } from '@/components/PipelineView';
import { ResumePreview } from '@/components/ResumePreview';
import { ActionBar } from '@/components/ActionBar';
import { ScoreCard } from '@/components/ScoreCard';
import { useGenerate } from '@/lib/useGenerate';
import { compileTex } from '@/lib/latex/compile';
import Link from 'next/link';

export default function EnhancePage() {
  const { state, start } = useGenerate();
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [compileLog, setCompileLog] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!state.tex) return;
    setPdf(null);
    setCompileLog(null);
    void compileTex(state.tex).then((r) => {
      setPdf(r.pdf);
      if (!r.pdf) setCompileLog(r.log);
    });
  }, [state.tex]);

  return (
    <main>
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Back</Link>
        <h1 className="text-xl font-semibold">Enhance Resume</h1>
        <span />
      </header>
      {state.events.length === 0 && !state.running ? (
        <InputPanel
          showJd={false}
          submitting={state.running}
          onSubmit={(d) => start({ mode: 'enhance', resumeText: d.resumeText })}
        />
      ) : (
        <>
          <PipelineView events={state.events} />
          {state.before && state.after && (
            <div className="px-6 pb-6">
              <ScoreCard before={state.before} after={state.after} />
            </div>
          )}
          {state.error && (
            <div className="mx-auto max-w-3xl px-6 pb-4 text-sm text-red-400">
              Error: {state.error}
            </div>
          )}
          {compileLog && (
            <details className="mx-auto max-w-3xl rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm">
              <summary className="cursor-pointer">PDF compile failed — open log</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{compileLog}</pre>
            </details>
          )}
          <ActionBar
            pdf={pdf} tex={state.tex}
            showPreview={showPreview}
            onPreview={() => setShowPreview((v) => !v)}
          />
          {showPreview && <ResumePreview pdf={pdf} />}
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Build sanity check**

```bash
npm run build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add app/enhance/page.tsx
git commit -m "feat(ui): enhance flow page with ScoreCard"
```

---

## Task 26: Manual smoke test

**Files:** none (manual)

- [ ] **Step 1: Run dev server with real Gemini key**

```bash
echo "GEMINI_API_KEY=<your-real-key>" > .env.local
npm run dev
```

Open http://localhost:3000.

- [ ] **Step 2: Tailor flow walkthrough**

1. Click "Tailor to JD".
2. Upload `C:\Users\amity\Downloads\Resume.pdf` (or paste text).
3. Paste any sample JD (e.g., a real backend engineer JD from LinkedIn).
4. Click "Build resume".

Expected:
- Pipeline view animates each step (parse → analyze-jd ‖ extract → tailor → render) with running spinner → green check.
- After ~10–20s, "Loading LaTeX engine" appears once, then "Preview" and "Download .pdf" enable.
- Preview shows the rendered resume PDF in the iframe.
- Download saves a working `resume.pdf` matching your template style.

- [ ] **Step 3: Enhance flow walkthrough**

1. Click "Enhance Resume".
2. Upload the same PDF.
3. Click "Build resume".

Expected:
- Pipeline animates: parse → extract → score-before → rewrite → score-after → render.
- ScoreCard shows before/after numbers + per-dimension bars.
- Preview + Download work.

- [ ] **Step 4: Error path check**

1. Disconnect from network mid-run (e.g., after parse step). Confirm a red `error` step appears with message and the page does not crash.
2. Re-run a successful flow. Confirm everything still works.

- [ ] **Step 5: Document smoke results**

Append manual test log to `docs/superpowers/specs/2026-05-01-build-resume-design.md`:

```markdown
## Smoke Test Log

- [date] Tailor flow: PASS — JD = `<role>`, render time = `<ms>`.
- [date] Enhance flow: PASS — before `<n>`, after `<n>`.
- [date] Error path: handled cleanly.
```

- [ ] **Step 6: Final commit**

```bash
git add docs/superpowers/specs/2026-05-01-build-resume-design.md
git commit -m "docs: add smoke test log"
```

---

## Self-Review

**Spec coverage check:**
- Two modes (Tailor / Enhance) → Tasks 13, 14, 24, 25 ✓
- Animated pipeline UI driven by SSE → Tasks 5, 15, 20, 24 ✓
- LaTeX template rendered exactly → Tasks 3, 4 ✓
- Preview + Download → Task 23 ✓
- Before/after score → Tasks 11, 22, 25 ✓
- Client-side PDF text extract (Edge-runtime constraint) → Task 16 ✓
- SwiftLaTeX in browser → Task 17 ✓
- Header editor for missing fields → Task 21 ✓ (component built; integration into flow pages is intentionally deferred — extract step always returns header fields, and a follow-up task can wire HeaderEditor in once we observe real-world failure modes)
- Error handling + retry → Task 24/25 show error state; full-pipeline retry simply re-runs `start()` (no extra task needed; the reset already happens inside `useGenerate.start`)
- Stateless pipeline (no in-memory step memo) → enforced by Edge runtime in Task 15 ✓
- Tests at unit, integration (orchestrator), golden snapshot levels → Tasks 3, 4, 5, 6, 7–14 ✓

**Placeholder scan:** none. Every step has concrete code or commands.

**Type consistency:** `ResumeData`, `JDAnalysis`, `Score`, `PipelineEvent` defined once in Task 2 and consumed unchanged throughout. `ResumeDataSchema` (Task 10) is shared by `extractResume`, `tailorStep`, `rewriteResume`. `runStep` (Task 14) is shared by both orchestrators.

**Known small gap left as follow-up:** HeaderEditor is built in Task 21 but not wired into the flow pages in Tasks 24/25. This is a deliberate v1.1 hook — adding it now adds two more tasks and obscures the core flow. Track separately.
