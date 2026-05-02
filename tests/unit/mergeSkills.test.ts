import { describe, it, expect } from 'vitest';
import { mergeSkillsStep } from '@/lib/pipeline/steps/mergeSkills';
import type { ResumeData, JDAnalysis } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

const resume = sample as unknown as ResumeData;

function jd(over: Partial<JDAnalysis> = {}): JDAnalysis {
  return {
    role: 'BE', mustHaveSkills: [], niceToHaveSkills: [],
    keywords: [], tone: 'technical', seniority: 'junior',
    ...over
  };
}

describe('mergeSkillsStep', () => {
  it('adds JD must-have skill that appears in source resume text', () => {
    const sourceText = 'Built WebSocket APIs using Docker and Kubernetes for backend services.';
    const out = mergeSkillsStep({
      resume,
      jd: jd({ mustHaveSkills: ['Docker', 'Kubernetes'] }),
      sourceText
    });
    expect(out.added.tools).toEqual(expect.arrayContaining(['Docker', 'Kubernetes']));
    expect(out.resume.skills.tools).toContain('Docker');
    expect(out.resume.skills.tools).toContain('Kubernetes');
    expect(out.skipped).toEqual([]);
  });

  it('skips JD skill not present in source text', () => {
    const out = mergeSkillsStep({
      resume,
      jd: jd({ mustHaveSkills: ['Rust', 'Kafka'] }),
      sourceText: 'Plain resume text without those terms.'
    });
    expect(out.added.languages).toEqual([]);
    expect(out.added.tools).toEqual([]);
    expect(out.skipped).toEqual(['Rust', 'Kafka']);
  });

  it('does not duplicate skill already in bucket', () => {
    const out = mergeSkillsStep({
      resume,
      jd: jd({ mustHaveSkills: ['Python', 'TypeScript'] }),
      sourceText: 'Python TypeScript portfolio'
    });
    expect(out.added.languages).toEqual([]);
    expect(out.resume.skills.languages).toBe(resume.skills.languages);
  });

  it('routes skills to correct bucket', () => {
    const out = mergeSkillsStep({
      resume,
      jd: jd({ mustHaveSkills: ['Go', 'FastAPI', 'Postgres'] }),
      sourceText: 'Go FastAPI Postgres experience.'
    });
    expect(out.added.languages).toContain('Go');
    expect(out.added.frameworks).toContain('FastAPI');
    expect(out.added.tools).toContain('Postgres');
  });

  it('dedupes case-insensitively across must-have and nice-to-have', () => {
    const out = mergeSkillsStep({
      resume,
      jd: jd({ mustHaveSkills: ['Docker'], niceToHaveSkills: ['docker'] }),
      sourceText: 'Docker pipelines.'
    });
    expect(out.added.tools.filter(s => s.toLowerCase() === 'docker').length).toBe(1);
  });
});
