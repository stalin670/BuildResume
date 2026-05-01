import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const YTOTECH_ENDPOINT = 'https://latex.ytotech.com/builds/sync';
const TEXLIVE_ENDPOINT = 'https://texlive.net/cgi-bin/latexcgi';

type CompileOut = { pdf: ArrayBuffer | null; log: string; status: number };

async function compileViaYtotech(tex: string): Promise<CompileOut> {
  const res = await fetch(YTOTECH_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      compiler: 'pdflatex',
      resources: [{ main: true, content: tex }]
    })
  });
  const ct = res.headers.get('content-type') ?? '';
  if (res.ok && ct.includes('pdf')) {
    return { pdf: await res.arrayBuffer(), log: '', status: 0 };
  }
  let log = '';
  try {
    const j = await res.json();
    log = (j.logs ?? j.error ?? JSON.stringify(j)).toString();
  } catch {
    log = await res.text();
  }
  return { pdf: null, log: log.slice(0, 8000), status: res.status || 1 };
}

async function compileViaTexlive(tex: string): Promise<CompileOut> {
  const form = new FormData();
  form.append('return', 'pdf');
  form.append('engine', 'pdflatex');
  form.append('filename[]', 'document.tex');
  form.append('filecontents[]', tex);
  const res = await fetch(TEXLIVE_ENDPOINT, { method: 'POST', body: form });
  const ct = res.headers.get('content-type') ?? '';
  if (res.ok && ct.includes('pdf')) {
    return { pdf: await res.arrayBuffer(), log: '', status: 0 };
  }
  const log = await res.text();
  return { pdf: null, log: log.slice(0, 8000), status: res.status || 1 };
}

export async function POST(req: NextRequest) {
  let tex = '';
  try {
    const body = await req.json();
    tex = String(body?.tex ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!tex.trim()) return NextResponse.json({ error: 'tex is required' }, { status: 400 });

  const attempts: { name: string; out: CompileOut }[] = [];

  for (const [name, fn] of [
    ['ytotech', compileViaYtotech],
    ['texlive.net', compileViaTexlive]
  ] as const) {
    try {
      const out = await fn(tex);
      if (out.pdf) {
        return new NextResponse(out.pdf, {
          status: 200,
          headers: { 'content-type': 'application/pdf', 'cache-control': 'no-store' }
        });
      }
      attempts.push({ name, out });
    } catch (e) {
      attempts.push({ name, out: { pdf: null, log: `${(e as Error).message}`, status: 502 } });
    }
  }

  const log = attempts.map(a => `=== ${a.name} (status ${a.out.status}) ===\n${a.out.log}`).join('\n\n');
  return NextResponse.json({ error: 'compile failed', log }, { status: 502 });
}
