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
