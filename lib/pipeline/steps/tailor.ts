import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData, JDAnalysis } from '@/types/resume';

import { ResumeDataSchema } from './_schemas';

export async function tailorStep(
  args: { resume: ResumeData; jd: JDAnalysis },
  ctx: { gemini: GeminiClient }
): Promise<ResumeData> {
  const prompt = `You are an expert ATS resume writer. Rewrite the candidate's resume so it ranks highly for the target JD WITHOUT inventing experience.

Hard rules (do not break):
- Preserve header, education, dates, companies, schools, GPAs, project names, and all factual claims exactly.
- Never invent a metric, employer, project, or experience that is not present in the original.
- Keep each bullet detail under 200 characters.

Tailoring directives (apply aggressively):
1. REORDER experience and projects so items most relevant to the JD must-have skills appear first.
2. REWRITE every bullet "detail" to:
   - start with a strong action verb (Built, Designed, Shipped, Led, Optimized, Reduced, Scaled, Migrated, Automated, Architected),
   - weave in JD must-have keywords and ATS keywords NATURALLY where the original work plausibly involved them (e.g. if original says "REST APIs" and JD wants "microservices", you may say "REST microservices" only if that is a fair description — do not fabricate),
   - prefer concrete nouns over vague ones (use the JD's exact term when it fits).
3. REWRITE every bullet "title" to be punchier and keyword-loaded (3–6 words).
4. SKILLS section: ensure every JD must-have keyword the candidate plausibly has (i.e. mentioned anywhere in the original resume) appears in the appropriate skills bucket. Do not add a keyword that has zero basis in the original.
5. PROJECTS: keep names and URLs exact. You MAY refresh tagline/description/tech to surface JD-relevant aspects, but only describe work that actually exists.
6. If a role has more than 4 bullets, drop the 1–2 weakest only if it improves clarity.

Output: return ONLY the rewritten ResumeData JSON. No prose. No markdown.

JD Analysis:
${JSON.stringify(args.jd, null, 2)}

Original Resume:
${JSON.stringify(args.resume, null, 2)}`;

  return ctx.gemini.generateJson<ResumeData>({
    prompt,
    schema: ResumeDataSchema,
    temperature: 0.7
  });
}
