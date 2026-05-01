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
