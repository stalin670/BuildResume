'use client';

type EngineLike = {
  loadEngine: () => Promise<void>;
  writeMemFSFile: (name: string, content: string) => void;
  setEngineMainFile: (name: string) => void;
  compileLaTeX: () => Promise<{ pdf: Uint8Array; log: string; status: number }>;
  flushCache: () => void;
};

let cached: EngineLike | null = null;

async function getEngine(): Promise<EngineLike> {
  if (cached) return cached;
  await new Promise<void>((resolve, reject) => {
    if ((window as unknown as { PdfTeXEngine?: unknown }).PdfTeXEngine) return resolve();
    const s = document.createElement('script');
    s.src = '/swiftlatex/PdfTeXEngine.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load SwiftLaTeX engine script'));
    document.head.appendChild(s);
  });
  const Ctor = (window as unknown as { PdfTeXEngine: new () => EngineLike }).PdfTeXEngine;
  const engine = new Ctor();
  await engine.loadEngine();
  cached = engine;
  return engine;
}

export type CompileResult = { pdf: Blob | null; log: string; status: number };

export async function compileTex(tex: string): Promise<CompileResult> {
  const engine = await getEngine();
  engine.flushCache();
  engine.writeMemFSFile('main.tex', tex);
  engine.setEngineMainFile('main.tex');
  const r = await engine.compileLaTeX();
  return {
    pdf: r.status === 0 ? new Blob([r.pdf as unknown as ArrayBuffer], { type: 'application/pdf' }) : null,
    log: r.log,
    status: r.status
  };
}
