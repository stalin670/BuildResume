import { describe, it, expect, vi } from 'vitest';
import { runTailor } from '@/lib/pipeline/tailor';
import type { GeminiClient } from '@/lib/gemini';
import type { PipelineEvent } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('runTailor orchestrator', () => {
  it('emits parse → analyze-jd ‖ extract → tailor → render → final', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn()
        .mockResolvedValueOnce({   // analyzeJd
          role: 'BE', mustHaveSkills: [], niceToHaveSkills: [],
          keywords: [], tone: 'technical', seniority: 'junior'
        })
        .mockResolvedValueOnce(sample) // extractResume
        .mockResolvedValueOnce(sample) // tailor
    };
    await runTailor(
      { mode: 'tailor', resumeText: 'raw resume', jdText: 'JD text' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    const stepOrder = events.filter(e => e.type === 'step' && e.status === 'done').map(e => (e as any).id);
    expect(stepOrder).toEqual(['parse', 'analyze-jd', 'extract', 'tailor', 'render']);
    expect(events.find(e => e.type === 'final')).toBeTruthy();
  });

  it('emits error event when a step throws', async () => {
    const events: PipelineEvent[] = [];
    const fake: GeminiClient = {
      generateJson: vi.fn().mockRejectedValueOnce(new Error('boom'))
    };
    await runTailor(
      { mode: 'tailor', resumeText: 'r', jdText: 'j' },
      { gemini: fake, emit: (e) => events.push(e) }
    );
    expect(events.some(e => e.type === 'error')).toBe(true);
    expect(events.find(e => e.type === 'final')).toBeFalsy();
  });
});
