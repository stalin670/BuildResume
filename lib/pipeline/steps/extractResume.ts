import type { GeminiClient } from '@/lib/gemini';
import type { ResumeData } from '@/types/resume';
import { ResumeDataSchema } from './_schemas';

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
    schema: ResumeDataSchema,
    temperature: 0.1
  });
}
