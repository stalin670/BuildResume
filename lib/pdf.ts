'use client';

let workerSrcSet = false;

async function ensurePdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerSrcSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    workerSrcSet = true;
  }
  return pdfjs;
}

export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Not a PDF file');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('PDF too large (max 5MB)');
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await ensurePdfjs();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out.push((content.items as any[]).map((it: { str?: string }) => it.str ?? '').join(' '));
  }
  return out.join('\n').trim();
}
