import { describe, it, expect, vi } from 'vitest';
import { runEnhance } from '@/lib/pipeline/enhance';
import type { GeminiClient } from '@/lib/gemini';
import type { PipelineEvent } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

const SCORE_BEFORE = {
  overall: 60,
  dimensions: {
    actionVerbs: 60, quantification: 50, keywordBreadth: 60,
    bulletStrength: 60, clarity: 70, length: 60
  },
  weaknesses: ['weak verbs', 'no metrics']
};

const SCORE_AFTER = { ...SCORE_BEFORE, overall: 85 };

describe('runEnhance orchestrator', () => {
  it('emits parse → extract → score-before → rewrite → score-after → render → final with both scores', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn()
        .mockResolvedValueOnce(sample)        // extract
        .mockResolvedValueOnce(SCORE_BEFORE)  // score-before
        .mockResolvedValueOnce(sample)        // rewrite
        .mockResolvedValueOnce(SCORE_AFTER)   // score-after
    };
    await runEnhance(
      { mode: 'enhance', resumeText: 'raw resume' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    const ids = events.filter(e => e.type === 'step' && e.status === 'done').map(e => (e as any).id);
    expect(ids).toEqual(['parse', 'extract', 'score-before', 'rewrite', 'score-after', 'render']);
    const final = events.find(e => e.type === 'final') as any;
    expect(final.before.overall).toBe(60);
    expect(final.after.overall).toBe(85);
  });
});
