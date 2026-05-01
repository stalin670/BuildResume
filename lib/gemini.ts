import { GoogleGenerativeAI } from '@google/generative-ai';

export type GeminiCallOptions = {
  prompt: string;
  schema: Record<string, unknown>;
  temperature: number;
  model?: string;
};

export type GeminiClient = {
  generateJson<T>(opts: GeminiCallOptions): Promise<T>;
};

type SdkLike = {
  getGenerativeModel: (cfg: { model: string; generationConfig?: unknown }) => {
    generateContent: (input: unknown) => Promise<{ response: { text: () => string } }>;
  };
};

export type CreateGeminiOpts = {
  apiKey: string;
  sdkFactory?: (apiKey: string) => SdkLike;
};

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'];

function isTransient(e: unknown): boolean {
  const msg = (e as Error)?.message ?? String(e);
  return /\b(429|500|502|503|504)\b|Service Unavailable|overloaded|high demand|fetch failed|ECONNRESET|ETIMEDOUT|timeout|Internal error/i.test(msg);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function createGeminiClient(opts: CreateGeminiOpts): GeminiClient {
  const sdk = opts.sdkFactory
    ? opts.sdkFactory(opts.apiKey)
    : (new GoogleGenerativeAI(opts.apiKey) as unknown as SdkLike);

  return {
    async generateJson<T>(call: GeminiCallOptions): Promise<T> {
      const primary = call.model ?? DEFAULT_MODEL;
      const candidates = [primary, ...FALLBACK_MODELS.filter(m => m !== primary)];

      const buildModel = (name: string) =>
        sdk.getGenerativeModel({
          model: name,
          generationConfig: {
            temperature: call.temperature,
            responseMimeType: 'application/json',
            responseSchema: call.schema
          }
        });

      const callWithBackoff = async (modelName: string, prompt: string) => {
        const model = buildModel(modelName);
        let lastErr: unknown;
        for (let i = 0; i < 4; i++) {
          try {
            return await model.generateContent(prompt);
          } catch (e) {
            lastErr = e;
            if (!isTransient(e) || i === 3) throw e;
            await sleep(500 * Math.pow(2, i) + Math.floor(Math.random() * 250));
          }
        }
        throw lastErr;
      };

      const tryOnce = async (prompt: string): Promise<T> => {
        let lastErr: unknown;
        for (const m of candidates) {
          try {
            const r = await callWithBackoff(m, prompt);
            const txt = r.response.text();
            return JSON.parse(txt) as T;
          } catch (e) {
            lastErr = e;
            if (!isTransient(e)) throw e;
          }
        }
        throw lastErr;
      };

      try {
        return await tryOnce(call.prompt);
      } catch (e) {
        const stricter = `${call.prompt}\n\nReturn ONLY a valid JSON object matching the requested schema. No prose, no markdown, no code fences.`;
        try {
          return await tryOnce(stricter);
        } catch (e2) {
          const msg = (e2 as Error).message;
          if (isTransient(e2)) {
            throw new Error(`Gemini upstream unavailable after retries across ${candidates.join(', ')}: ${msg}`);
          }
          throw new Error(`Gemini JSON parse failed after retry: ${msg}`);
        }
      }
    }
  };
}
