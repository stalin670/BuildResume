import type { GeminiClient } from '@/lib/gemini';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';
import { runStep } from './_runStep';
import { parseInputs } from './steps/parseInputs';
import { extractResume } from './steps/extractResume';
import { scoreResume } from './steps/scoreBefore';
import { rewriteResume } from './steps/rewrite';
import { scoreAfter } from './steps/scoreAfter';
import { renderLatexStep } from './steps/renderLatex';

type Ctx = { gemini: GeminiClient; emit: (e: PipelineEvent) => void };

export async function runEnhance(
  req: Extract<GenerateRequest, { mode: 'enhance' }>,
  ctx: Ctx
): Promise<void> {
  const parsed = await runStep('parse', 'Parse inputs',
    () => parseInputs({ resumeText: req.resumeText, jdText: '' }), ctx);
  if (!parsed) return;

  const resume = await runStep('extract', 'Extract resume',
    () => extractResume({ resumeText: parsed.resumeText }, { gemini: ctx.gemini }), ctx);
  if (!resume) return;

  const before = await runStep('score-before', 'Score (before)',
    () => scoreResume({ resume }, { gemini: ctx.gemini }), ctx);
  if (!before) return;

  const rewritten = await runStep('rewrite', 'Rewrite content',
    () => rewriteResume({ resume, weaknesses: before.weaknesses }, { gemini: ctx.gemini }), ctx);
  if (!rewritten) return;

  const after = await runStep('score-after', 'Score (after)',
    () => scoreAfter({ resume: rewritten }, { gemini: ctx.gemini }), ctx);
  if (!after) return;

  const rendered = await runStep('render', 'Render LaTeX',
    () => renderLatexStep({ resume: rewritten }), ctx);
  if (!rendered) return;

  ctx.emit({ type: 'final', tex: rendered.tex, before, after });
}
