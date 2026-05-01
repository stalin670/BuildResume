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
