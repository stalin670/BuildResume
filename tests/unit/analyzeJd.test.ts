import { describe, it, expect, vi } from 'vitest';
import { analyzeJd } from '@/lib/pipeline/steps/analyzeJd';
import type { GeminiClient } from '@/lib/gemini';

describe('analyzeJd', () => {
  it('calls Gemini and returns parsed JDAnalysis', async () => {
    const fake: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue({
        role: 'Backend Engineer',
        mustHaveSkills: ['Go', 'Postgres'],
        niceToHaveSkills: ['Kafka'],
        keywords: ['microservices', 'scale'],
        tone: 'technical',
        seniority: 'mid'
      })
    };
    const out = await analyzeJd({ jdText: 'JD here' }, { gemini: fake });
    expect(out.role).toBe('Backend Engineer');
    expect(fake.generateJson).toHaveBeenCalledTimes(1);
  });
});
