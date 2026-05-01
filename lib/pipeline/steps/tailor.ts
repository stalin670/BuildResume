import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData, JDAnalysis } from '@/types/resume';

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
