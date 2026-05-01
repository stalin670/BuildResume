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

export function createGeminiClient(opts: CreateGeminiOpts): GeminiClient {
  const sdk = opts.sdkFactory
    ? opts.sdkFactory(opts.apiKey)
    : (new GoogleGenerativeAI(opts.apiKey) as unknown as SdkLike);

  return {
    async generateJson<T>(call: GeminiCallOptions): Promise<T> {
      const modelName = call.model ?? DEFAULT_MODEL;
      const model = sdk.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: call.temperature,
          responseMimeType: 'application/json',
          responseSchema: call.schema
        }
      });

      const tryOnce = async (prompt: string): Promise<T> => {
        const r = await model.generateContent(prompt);
        const txt = r.response.text();
        return JSON.parse(txt) as T;
      };

      try {
        return await tryOnce(call.prompt);
      } catch (e) {
        const stricter = `${call.prompt}\n\nReturn ONLY a valid JSON object matching the requested schema. No prose, no markdown, no code fences.`;
        try {
          return await tryOnce(stricter);
        } catch (e2) {
          throw new Error(`Gemini JSON parse failed after retry: ${(e2 as Error).message}`);
        }
      }
    }
  };
}
