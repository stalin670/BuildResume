import { describe, it, expect, vi } from 'vitest';
import { createGeminiClient } from '@/lib/gemini';

describe('GeminiClient', () => {
  it('returns parsed JSON on first try', async () => {
    const fakeModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => '{"role":"SWE","mustHaveSkills":[]}' }
      })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    const result = await client.generateJson<{ role: string }>({
      prompt: 'X', schema: {}, temperature: 0.2
    });
    expect(result.role).toBe('SWE');
  });

  it('retries once on JSON parse failure with stricter prompt', async () => {
    const fakeModel = {
      generateContent: vi.fn()
        .mockResolvedValueOnce({ response: { text: () => 'NOT JSON' } })
        .mockResolvedValueOnce({ response: { text: () => '{"ok":true}' } })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    const result = await client.generateJson<{ ok: boolean }>({
      prompt: 'X', schema: {}, temperature: 0.2
    });
    expect(result.ok).toBe(true);
    expect(fakeModel.generateContent).toHaveBeenCalledTimes(2);
  });

  it('throws after second failure', async () => {
    const fakeModel = {
      generateContent: vi.fn()
        .mockResolvedValue({ response: { text: () => 'still not json' } })
    };
    const fakeSdk = { getGenerativeModel: () => fakeModel };
    const client = createGeminiClient({ apiKey: 'k', sdkFactory: () => fakeSdk as never });
    await expect(
      client.generateJson({ prompt: 'X', schema: {}, temperature: 0.2 })
    ).rejects.toThrow(/JSON/i);
  });
});
