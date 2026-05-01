import { describe, it, expect } from 'vitest';
import { renderResume } from '@/lib/latex/template';
import type { ResumeData } from '@/types/resume';
import sample from '../fixtures/sampleResume.json' assert { type: 'json' };

describe('renderResume', () => {
  it('starts with documentclass', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex.trimStart().startsWith('\\documentclass')).toBe(true);
  });

  it('ends with end{document}', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex.trimEnd().endsWith('\\end{document}')).toBe(true);
  });

  it('embeds the candidate name escaped', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.header.name = 'A & B';
    const tex = renderResume(data);
    expect(tex).toContain('A \\& B');
  });

  it('renders an experience section heading', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex).toContain('\\section{Experience}');
    expect(tex).toContain('TExam');
    expect(tex).toContain('Real-Time Chat Interface');
  });

  it('renders projects with hyperlinked names', () => {
    const tex = renderResume(sample as ResumeData);
    expect(tex).toContain('\\href{https://intervu-three.vercel.app/}{Intervu}');
  });

  it('omits coursework section when empty', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.coursework = [];
    const tex = renderResume(data);
    expect(tex).not.toContain('\\section{Coursework}');
  });

  it('omits achievements section when empty', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.achievements = [];
    const tex = renderResume(data);
    expect(tex).not.toContain('\\section{Achievements}');
  });

  it('renders multiple education entries', () => {
    const data = JSON.parse(JSON.stringify(sample)) as ResumeData;
    data.education.push({
      school: 'NIT Surat', location: 'Surat, India',
      degree: 'Drop; GPA: 8.6', dates: 'July 2020 - June 2022'
    });
    const tex = renderResume(data);
    expect(tex).toContain('Galgotias University');
    expect(tex).toContain('NIT Surat');
  });
});
