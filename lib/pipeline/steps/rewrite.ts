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
