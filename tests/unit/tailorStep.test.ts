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
