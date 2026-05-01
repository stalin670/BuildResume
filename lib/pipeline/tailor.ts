import type { GeminiClient } from '@/lib/gemini';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';
import { runStep } from './_runStep';
import { parseInputs } from './steps/parseInputs';
import { analyzeJd } from './steps/analyzeJd';
import { extractResume } from './steps/extractResume';
import { tailorStep } from './steps/tailor';
import { renderLatexStep } from './steps/renderLatex';

type Ctx = { gemini: GeminiClient; emit: (e: PipelineEvent) => void };

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

  const rendered = await runStep('render', 'Render LaTeX',
    () => renderLatexStep({ resume: tailored }), ctx);
  if (!rendered) return;

  ctx.emit({ type: 'final', tex: rendered.tex });
}
