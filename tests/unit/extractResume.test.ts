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
