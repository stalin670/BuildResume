import type { GeminiClient } from '@/lib/gemini';
import type { GenerateRequest, PipelineEvent, ResumeData, TailorDiff } from '@/types/resume';
import { runStep } from './_runStep';
import { parseInputs } from './steps/parseInputs';
import { analyzeJd } from './steps/analyzeJd';
import { extractResume } from './steps/extractResume';
import { tailorStep } from './steps/tailor';
import { mergeSkillsStep } from './steps/mergeSkills';
import { renderLatexStep } from './steps/renderLatex';

type Ctx = { gemini: GeminiClient; emit: (e: PipelineEvent) => void };

function expSignature(r: ResumeData): string {
  return r.experience.map(e => `${e.company}|${e.role}`).join('»');
}
function projSignature(r: ResumeData): string {
  return r.projects.map(p => p.name).join('»');
}
function countRewrittenBullets(orig: ResumeData, next: ResumeData): number {
  const map = new Map<string, string>();
  for (const e of orig.experience) for (const b of e.bullets) {
    map.set(`${e.company}|${e.role}|${b.title.toLowerCase()}`, b.detail);
  }
  let n = 0;
  for (const e of next.experience) for (const b of e.bullets) {
    const key = `${e.company}|${e.role}|${b.title.toLowerCase()}`;
    const prev = map.get(key);
    if (prev === undefined || prev !== b.detail) n++;
  }
  return n;
}

export async function runTailor(
  req: Extract<GenerateRequest, { mode: 'tailor' }>,
  ctx: Ctx
): Promise<void> {
  const parsed = await runStep('parse', 'Parse inputs',
    () => parseInputs({ resumeText: req.resumeText, jdText: req.jdText }), ctx);
  if (!parsed) return;

  const [jd, resume] = await Promise.all([
    runStep('analyze-jd', 'Analyze JD',
      () => analyzeJd({ jdText: parsed.jdText }, { gemini: ctx.gemini }), ctx),
    runStep('extract', 'Extract resume',
      () => extractResume({ resumeText: parsed.resumeText }, { gemini: ctx.gemini }), ctx)
  ]);
  if (!jd || !resume) return;

  const tailored = await runStep('tailor', 'Tailor content',
    () => tailorStep({ resume, jd }, { gemini: ctx.gemini }), ctx);
  if (!tailored) return;

  const merged = await runStep('merge-skills', 'Merge JD skills',
    async () => mergeSkillsStep({ resume: tailored, jd, sourceText: parsed.resumeText }), ctx);
  if (!merged) return;

  const diff: TailorDiff = {
    addedSkills: merged.added,
    skippedSkills: merged.skipped,
    rewrittenBullets: countRewrittenBullets(resume, merged.resume),
    reorderedExperience: expSignature(resume) !== expSignature(merged.resume),
    reorderedProjects: projSignature(resume) !== projSignature(merged.resume)
  };
  ctx.emit({ type: 'diff', diff });

  const rendered = await runStep('render', 'Render LaTeX',
    () => renderLatexStep({ resume: merged.resume }), ctx);
  if (!rendered) return;

  ctx.emit({ type: 'final', tex: rendered.tex });
}
