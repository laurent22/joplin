import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const outDir = resolve(__dirname, '../NotesTN/NotesTN/Editor');
mkdirSync(outDir, { recursive: true });

const bundlePath = resolve(outDir, 'editor.bundle.js');

const buildOptions = {
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  format: 'iife',
  target: ['safari14', 'chrome90'],
  platform: 'browser',
  outfile: bundlePath,
  minify: false, // Keep readable for debugging; set true for release
  sourcemap: false,
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  const result = await esbuild.build(buildOptions);
  if (result.errors.length === 0) {
    console.log(`Built editor.bundle.js → ${bundlePath}`);
    writeEditorHtml(outDir);
  }
}

function writeEditorHtml(outDir) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; img-src 'self' data: file: blob:;">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --font-body: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    --font-mono: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
    --color-text: #000;
    --color-bg: #fff;
    --color-secondary: #666;
    --color-selection: rgba(0, 120, 255, 0.2);
    --color-code-bg: rgba(0, 0, 0, 0.06);
    --color-blockquote: #999;
    --color-highlight: #fef08a;
    --color-link: #c9901a;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-text: #f0f0f0;
      --color-bg: #1e1e1e;
      --color-secondary: #aaa;
      --color-selection: rgba(80, 160, 255, 0.3);
      --color-code-bg: rgba(255, 255, 255, 0.08);
      --color-blockquote: #777;
      --color-highlight: #854d0e;
      --color-link: #fbbf24;
    }
  }

  html, body {
    height: 100%;
    background: var(--color-bg);
    color: var(--color-text);
  }

  body {
    padding: 0 24px 48px;
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ProseMirror container */
  #editor {
    outline: none;
    min-height: calc(100vh - 48px);
  }

  .ProseMirror {
    outline: none;
    min-height: inherit;
  }

  .ProseMirror > * + * { margin-top: 0.75em; }

  /* Headings */
  .ProseMirror h1 { font-size: 1.8em; font-weight: 700; line-height: 1.2; }
  .ProseMirror h2 { font-size: 1.5em; font-weight: 600; line-height: 1.25; }
  .ProseMirror h3 { font-size: 1.25em; font-weight: 600; }
  .ProseMirror h4 { font-size: 1.1em; font-weight: 600; }
  .ProseMirror h5 { font-size: 1em; font-weight: 600; }
  .ProseMirror h6 { font-size: 0.9em; font-weight: 600; color: var(--color-secondary); }

  /* Paragraph */
  .ProseMirror p { margin: 0; }
  .ProseMirror p + p { margin-top: 0.5em; }

  /* Inline code */
  .ProseMirror code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: var(--color-code-bg);
    border-radius: 3px;
    padding: 1px 4px;
  }

  /* Code block */
  .ProseMirror pre {
    background: var(--color-code-bg);
    border-radius: 6px;
    padding: 12px 16px;
    overflow-x: auto;
  }
  .ProseMirror pre code {
    background: none;
    padding: 0;
    font-size: 0.875em;
  }

  /* Blockquote */
  .ProseMirror blockquote {
    border-left: 3px solid var(--color-blockquote);
    margin: 0;
    padding-left: 16px;
    color: var(--color-secondary);
  }

  /* Lists */
  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5em;
  }
  .ProseMirror li { margin: 0.1em 0; }
  .ProseMirror li > p { margin: 0; }

  /* Task list */
  .ProseMirror ul[data-is-checklist] {
    list-style: none;
    padding-left: 0.25em;
  }
  .ProseMirror ul[data-is-checklist] li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .ProseMirror ul[data-is-checklist] li input[type="checkbox"] {
    margin-top: 3px;
    flex-shrink: 0;
    cursor: pointer;
    width: 15px;
    height: 15px;
  }
  .ProseMirror ul[data-is-checklist] li.checked > div {
    text-decoration: line-through;
    opacity: 0.55;
  }

  /* Images */
  .ProseMirror img {
    max-width: 100%;
    border-radius: 4px;
    display: block;
  }
  .ProseMirror img.ProseMirror-selectednode {
    outline: 2px solid #0078ff;
  }

  /* Horizontal rule */
  .ProseMirror hr {
    border: none;
    border-top: 1px solid var(--color-code-bg);
    margin: 1.5em 0;
  }

  /* Links */
  .ProseMirror a {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Highlight */
  .ProseMirror mark {
    background: var(--color-highlight);
    border-radius: 2px;
    padding: 0 2px;
  }

  /* Heading collapse arrows */
  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3,
  .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ProseMirror .pm-heading-content { flex: 1; }
  .ProseMirror .pm-heading-arrow {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 3px;
    color: var(--color-secondary);
    font-size: 1em;
    font-weight: normal;
    opacity: 1;
    transform: rotate(90deg); /* expanded: chevron points down */
    transition: transform 0.15s ease;
    user-select: none;
  }
  .ProseMirror .pm-heading-arrow::after { content: '›'; }
  .ProseMirror .pm-heading-arrow:hover { background: var(--color-code-bg); }
  /* Collapsed: chevron points right */
  .ProseMirror h1[data-collapsed] .pm-heading-arrow,
  .ProseMirror h2[data-collapsed] .pm-heading-arrow,
  .ProseMirror h3[data-collapsed] .pm-heading-arrow,
  .ProseMirror h4[data-collapsed] .pm-heading-arrow,
  .ProseMirror h5[data-collapsed] .pm-heading-arrow,
  .ProseMirror h6[data-collapsed] .pm-heading-arrow { transform: rotate(0deg); }
  /* Blocks hidden by a collapsed heading */
  .pm-heading-section-hidden { display: none; }

  /* Toggle / collapsible sections */
  .ProseMirror details {
    border: 1px solid var(--color-code-bg);
    border-radius: 6px;
    overflow: hidden;
  }
  .ProseMirror summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    font-weight: 600;
    list-style: none;
    cursor: default;
  }
  .ProseMirror summary::-webkit-details-marker { display: none; }
  .ProseMirror .pm-toggle-arrow {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 3px;
    color: var(--color-secondary);
    font-size: 0.6em;
    transition: transform 0.15s ease;
    user-select: none;
  }
  .ProseMirror .pm-toggle-arrow::after { content: '▶'; }
  .ProseMirror .pm-toggle-arrow:hover { background: var(--color-code-bg); }
  .ProseMirror details[open] > summary .pm-toggle-arrow { transform: rotate(90deg); }
  .ProseMirror .pm-toggle-content { flex: 1; outline: none; }
  .ProseMirror details > *:not(summary) {
    padding: 6px 12px 10px;
    border-top: 1px solid var(--color-code-bg);
  }

  /* Gap cursor */
  .ProseMirror-gapcursor {
    display: none;
    pointer-events: none;
    position: absolute;
  }
  .ProseMirror-gapcursor::after {
    content: "";
    display: block;
    position: absolute;
    top: -2px;
    width: 20px;
    border-top: 1px solid black;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }
  .ProseMirror-focused .ProseMirror-gapcursor { display: block; }

  /* Tables */
  .ProseMirror table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.9em;
  }
  .ProseMirror th, .ProseMirror td {
    border: 1px solid var(--color-blockquote);
    padding: 6px 10px;
    text-align: left;
  }
  .ProseMirror th { background: var(--color-code-bg); font-weight: 600; }
  .selectedCell::after {
    z-index: 2;
    position: absolute;
    content: "";
    left: 0; right: 0; top: 0; bottom: 0;
    background: var(--color-selection);
    pointer-events: none;
  }
</style>
</head>
<body>
<div id="editor"></div>
<script src="editor.bundle.js"></script>
</body>
</html>`;

  writeFileSync(resolve(outDir, 'editor.html'), html);
  console.log(`Wrote editor.html → ${outDir}`);
}
