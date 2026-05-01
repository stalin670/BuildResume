import { describe, it, expect } from 'vitest';
import { parseInputs } from '@/lib/pipeline/steps/parseInputs';

describe('parseInputs', () => {
  it('strips non-printable chars from resume text', async () => {
    const r = await parseInputs({ resumeText: 'A\x00B\x07C', jdText: '' });
    expect(r.resumeText).toBe('ABC');
  });
  it('collapses excessive whitespace', async () => {
    const r = await parseInputs({ resumeText: 'A   B\n\n\n\nC', jdText: '' });
    expect(r.resumeText).toBe('A B\n\nC');
  });
  it('passes through clean JD', async () => {
    const r = await parseInputs({ resumeText: 'X', jdText: 'Senior SWE' });
    expect(r.jdText).toBe('Senior SWE');
  });
  it('throws on empty resume', async () => {
    await expect(parseInputs({ resumeText: '   ', jdText: '' }))
      .rejects.toThrow(/empty/i);
  });
});
