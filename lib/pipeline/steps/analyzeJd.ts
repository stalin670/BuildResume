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
