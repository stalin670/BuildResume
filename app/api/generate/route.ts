import { createGeminiClient } from '@/lib/gemini';
import { runTailor } from '@/lib/pipeline/tailor';
import { runEnhance } from '@/lib/pipeline/enhance';
import { encodeSSE } from '@/lib/sse';
import type { GenerateRequest, PipelineEvent } from '@/types/resume';

export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as GenerateRequest;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
  const gemini = createGeminiClient({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: PipelineEvent) => controller.enqueue(encoder.encode(encodeSSE(e)));
      try {
        if (body.mode === 'tailor') {
          await runTailor(body, { gemini, emit });
        } else if (body.mode === 'enhance') {
          await runEnhance(body, { gemini, emit });
        } else {
          emit({ type: 'error', stepId: 'init', message: 'unknown mode' });
        }
      } catch (e) {
        emit({ type: 'error', stepId: 'orchestrator', message: (e as Error).message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no'
    }
  });
}
