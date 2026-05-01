'use client';

export type CompileResult = { pdf: Blob | null; log: string; status: number };

export async function compileTex(tex: string): Promise<CompileResult> {
  try {
    const res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tex })
    });
    const ct = res.headers.get('content-type') ?? '';
    if (res.ok && ct.includes('pdf')) {
      const buf = await res.arrayBuffer();
      return { pdf: new Blob([buf], { type: 'application/pdf' }), log: '', status: 0 };
    }
    let log = '';
    try {
      const j = await res.json();
      log = j.log ?? j.error ?? `HTTP ${res.status}`;
    } catch {
      log = `HTTP ${res.status}`;
    }
    return { pdf: null, log, status: res.status || 1 };
  } catch (e) {
    return { pdf: null, log: `Compile request failed: ${(e as Error).message}`, status: -1 };
  }
}
