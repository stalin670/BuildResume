import type { PipelineEvent } from '@/types/resume';

export type StepCtx = {
  emit: (e: PipelineEvent) => void;
};

export async function runStep<T>(
  id: string, label: string,
  fn: () => Promise<T>,
  ctx: StepCtx
): Promise<T | null> {
  const start = Date.now();
  ctx.emit({ type: 'step', id, status: 'running', label });
  try {
    const out = await fn();
    ctx.emit({ type: 'step', id, status: 'done', label, durationMs: Date.now() - start });
    return out;
  } catch (e) {
    ctx.emit({ type: 'step', id, status: 'error', label, durationMs: Date.now() - start });
    ctx.emit({ type: 'error', stepId: id, message: (e as Error).message });
    return null;
  }
}
