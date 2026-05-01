# SwiftLaTeX Engine Files

This directory must contain four binary/JS engine files that power in-browser LaTeX compilation.
They are **not committed to the repository** because they are large binary artifacts.

## Required files

| File | Purpose |
|------|---------|
| `PdfTeXEngine.js` | Main engine class loaded by the compile wrapper |
| `swiftlatexpdftex.js` | Emscripten-compiled pdfTeX JS glue |
| `swiftlatexpdftex.wasm` | pdfTeX compiled to WebAssembly |
| `pdftex-worker.js` | Web Worker entry-point for the engine |

## Fetch attempts (automated — all returned 404)

The following URLs were tried on 2026-05-01 and all returned HTTP 404:

```
# PdfTeXEngine subdirectory (documented path)
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/PdfTeXEngine/PdfTeXEngine.js
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/PdfTeXEngine/swiftlatexpdftex.js
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/PdfTeXEngine/swiftlatexpdftex.wasm
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/PdfTeXEngine/pdftex-worker.js

# Repo root (master and main branches)
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/PdfTeXEngine.js
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/master/src/PdfTeXEngine.js
https://raw.githubusercontent.com/SwiftLaTeX/SwiftLaTeX/main/PdfTeXEngine.js

# npm / CDN (package "swiftlatex" not published)
https://cdn.jsdelivr.net/npm/swiftlatex/PdfTeXEngine.js
https://unpkg.com/swiftlatex/PdfTeXEngine.js
```

## Manual download instructions

1. Visit the SwiftLaTeX GitHub releases page:
   **https://github.com/SwiftLaTeX/SwiftLaTeX/releases**

2. Download the latest release archive (`.zip` or `.tar.gz`).

3. Extract the archive and locate the four files listed above.
   They are typically found in the repo root or a `dist/` / `PdfTeXEngine/` subdirectory.

4. Copy all four files into this directory (`public/swiftlatex/`).

5. Verify the build still passes:
   ```bash
   npm run build
   ```

6. At runtime the compile wrapper (`lib/latex/compile.ts`) loads `PdfTeXEngine.js`
   via a `<script>` tag injected into `document.head`. The WASM file must be
   co-located here so the engine can resolve it via a relative URL.

## Alternative: clone and copy

```bash
git clone --depth 1 https://github.com/SwiftLaTeX/SwiftLaTeX.git /tmp/swiftlatex
cp /tmp/swiftlatex/PdfTeXEngine/PdfTeXEngine.js      public/swiftlatex/
cp /tmp/swiftlatex/PdfTeXEngine/swiftlatexpdftex.js  public/swiftlatex/
cp /tmp/swiftlatex/PdfTeXEngine/swiftlatexpdftex.wasm public/swiftlatex/
cp /tmp/swiftlatex/PdfTeXEngine/pdftex-worker.js     public/swiftlatex/
```
Adjust the source path if the clone uses a different layout.
