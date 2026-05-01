import { renderResume } from '@/lib/latex/template';
import type { ResumeData } from '@/types/resume';

export async function renderLatexStep(
  args: { resume: ResumeData }
): Promise<{ tex: string }> {
  return { tex: renderResume(args.resume) };
}
