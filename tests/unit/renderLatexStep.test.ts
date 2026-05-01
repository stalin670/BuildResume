import { describe, it, expect } from 'vitest';
import { renderLatexStep } from '@/lib/pipeline/steps/renderLatex';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('renderLatexStep', () => {
  it('returns full .tex string', async () => {
    const out = await renderLatexStep({ resume: sample as never });
    expect(out.tex).toContain('\\documentclass');
    expect(out.tex).toContain('\\end{document}');
  });
});
