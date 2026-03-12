'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Fab from '@mui/material/Fab';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import tinymce from 'tinymce';
import { insertToc, setupTocAutoUpdate } from './tocPlugin';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
import 'tinymce/plugins/codesample';

/**
 * HTML テキストノードの連続スペースをノーブレークスペースに変換し、
 * TinyMCE 上でインデントが崩れないようにする。
 */
function preserveHtmlIndent(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent =
        node.textContent?.replace(/ {2,}/g, (m) => '\u00A0'.repeat(m.length)) ?? '';
    } else {
      node.childNodes.forEach(walk);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

// ---------- ヘルパー: DOM操作 ----------

function removeNextSiblingBr(element: HTMLElement, editor: any) {
  const next = element.nextSibling;
  if (next && next.nodeName === 'BR') {
    editor.dom.remove(next);
  }
}

function removeInnerBr(element: HTMLElement, editor: any) {
  const brs = editor.dom.select('br', element);
  for (const br of brs) {
    editor.dom.remove(br);
  }
}

// ---------- ヘルパー: Mermaid スクリプト注入 ----------

/**
 * TinyMCE の iframe 内に mermaid.min.js と mermaid_render.js を動的に注入する。
 * mermaid_render.js は joplin-noteDidUpdate イベントを購読して図をレンダリングする。
 */
function injectMermaidScripts(editor: any) {
  const doc = editor.getDoc() as Document;
  if (doc.querySelector('script[data-mermaid-injected]')) return; // 二重注入防止
  const script = doc.createElement('script');
  script.src = '/pluginAssets/mermaid/mermaid.min.js';
  script.setAttribute('data-mermaid-injected', '1');
  script.onload = () => {
    const renderScript = doc.createElement('script');
    renderScript.src = '/pluginAssets/mermaid/mermaid_render.js';
    doc.head.appendChild(renderScript);
  };
  doc.head.appendChild(script);
}

// ---------- ヘルパー: KaTeX スクリプト注入 ----------

/**
 * TinyMCE の iframe 内に KaTeX CSS・JS と katex_rendrer.js を動的に注入する。
 * katex_rendrer.js は joplin-kartexUpdate イベントを購読して数式をレンダリングする。
 */
function injectKatexScripts(editor: any) {
  const doc = editor.getDoc() as Document;
  if (doc.querySelector('script[data-katex-injected]')) return; // 二重注入防止

  // KaTeX CSS
  if (!doc.querySelector('link[data-katex-css]')) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/pluginAssets/katex/katex.css';
    link.setAttribute('data-katex-css', '1');
    doc.head.appendChild(link);
  }

  // katex.min.js → auto-render.min.js → katex_rendrer.js の順に注入
  const script = doc.createElement('script');
  script.src = '/pluginAssets/katex/katex.min.js';
  script.setAttribute('data-katex-injected', '1');
  script.onload = () => {
    const autoRender = doc.createElement('script');
    autoRender.src = '/pluginAssets/katex/contrib/auto-render.min.js';
    autoRender.onload = () => {
      const renderScript = doc.createElement('script');
      renderScript.src = '/pluginAssets/katex/katex_rendrer.js';
      doc.head.appendChild(renderScript);
    };
    doc.head.appendChild(autoRender);
  };
  doc.head.appendChild(script);
}

/**
 * ドキュメント内の全 KaTeX ブロックに joplin-kartexUpdate イベントを発火し、
 * 数式を再レンダリングする。スクリプト読み込み完了待ちのため遅延してから実行する。
 */
function triggerKatexRender(editor: any, delay = 500) {
  setTimeout(() => {
    const doc = editor.getDoc() as Document;
    doc.querySelectorAll('[katexTxt]').forEach((el) => {
      const fontSize = el.getAttribute('katexFontsize') ?? '1.2';
      doc.dispatchEvent(
        new CustomEvent('joplin-kartexUpdate', {
          detail: { id: el.id, fontSize, element: el },
        })
      );
    });
  }, delay);
}

// ---------- ヘルパー: Mermaid ダイアログ ----------

/**
 * mermaidJoplinRoot 要素のテキスト内容を更新し、mermaid を再レンダリングする。
 */
function updateMermaidDiv(editor: any, txt: string, mermaidRootElement: HTMLElement) {
  const root = mermaidRootElement;
  root.setAttribute('mermaidTxt', txt);
  const baseId = root.id.split('_')[1];
  root.innerHTML = '';

  const divDialog = document.createElement('div');
  divDialog.id = `mermaidJoplinDialog_${baseId}`;
  divDialog.setAttribute('class', 'mermaid');
  divDialog.textContent = txt;
  removeNextSiblingBr(divDialog, editor);
  removeInnerBr(divDialog, editor);

  root.appendChild(divDialog);
  editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
}

/**
 * Mermaid 編集ダイアログを TinyMCE の windowManager で開く。
 */
function openMermaidDialog(editor: any, initialValue: string, mermaidRootElement: HTMLElement) {
  editor.windowManager.open({
    title: 'Mermaid Diagram',
    size: 'large',
    initialData: {
      diagram: initialValue ?? '',
    },
    body: {
      type: 'panel',
      items: [
        {
          type: 'textarea',
          name: 'diagram',
          label: 'Diagram',
        },
      ],
    },
    buttons: [
      {
        type: 'cancel',
        text: 'Close',
      },
      {
        type: 'submit',
        text: 'Save',
        primary: true,
      },
    ],
    onSubmit: function (api: any) {
      const data = api.getData();
      updateMermaidDiv(editor, data.diagram, mermaidRootElement);
      api.close();
    },
  });
}

// ---------- ヘルパー: カスタムブロック挿入 ----------

function insertCommandPre(editor: any) {
  const preElement = document.createElement('pre');
  const preId = `${Date.now()}`;
  preElement.setAttribute(
    'style',
    'box-sizing:border-box;overflow:auto;font-family:Menlo,Monaco,Consolas,"Courier New",monospace;' +
      'font-size:11px;padding:8px;margin:0;line-height:1.42857;word-break:break-all;' +
      'overflow-wrap:break-word;color:rgb(157,165,180);background:rgb(49,54,63);' +
      'border:none;border-radius:3px;box-shadow:none;'
  );
  preElement.id = preId;
  preElement.innerText = ' ';
  editor.selection.setNode(preElement);
  const el = editor.dom.select(`pre#${preId}`)[0];
  removeNextSiblingBr(el, editor);
  const range = document.createRange();
  range.setStart(el, 0);
  range.setEnd(el, 0);
  editor.selection.setRng(range);
  editor.nodeChanged();
  editor.focus();
}

function insertMermaidDiv(editor: any) {
  const root = document.createElement('div');
  const dialog = document.createElement('div');
  const baseId = `${Date.now()}`;
  const txt = 'sequenceDiagram\n  Alice ->> Bob: Hello Bob, how are you?';
  dialog.id = `mermaidJoplinDialog_${baseId}`;
  dialog.setAttribute('class', 'mermaid');
  dialog.textContent = txt;
  root.id = `mermaidJoplinRoot_${baseId}`;
  root.setAttribute('mermaidTxt', txt);
  root.appendChild(dialog);
  editor.selection.setNode(root);
  const el = editor.dom.select(`div#${dialog.id}`)[0];
  removeNextSiblingBr(el, editor);
  removeInnerBr(el, editor);
  removeNextSiblingBr(editor.dom.select(`div#${root.id}`)[0], editor);
  const range = document.createRange();
  range.setStart(el, 0);
  range.setEnd(el, 0);
  editor.selection.setRng(range);
  editor.nodeChanged();
  editor.focus();
  editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
}

function updateKatexDiv(editor: any, txt: string, fontSize: string, katexRootElement: HTMLElement) {
  const root = katexRootElement;
  root.setAttribute('katexTxt', txt);
  root.setAttribute('katexFontsize', fontSize);
  const baseId = root.id.split('_')[1];
  root.innerHTML = '';

  const p = document.createElement('p');
  p.id = `katexDialog_${baseId}`;
  p.setAttribute('class', 'JoplinKatex');
  p.innerText = `\\[ ${txt} \\]`;
  root.appendChild(p);

  editor.getDoc().dispatchEvent(
    new CustomEvent('joplin-kartexUpdate', {
      detail: { id: root.id, fontSize, element: root },
    })
  );
}

function openKatexDialog(
  editor: any,
  initialValue: string,
  fontSize: string,
  katexRootElement: HTMLElement
) {
  editor.windowManager.open({
    title: 'KaTeX Math',
    size: 'large',
    initialData: {
      formula: initialValue,
      fontsize: fontSize,
    },
    body: {
      type: 'panel',
      items: [
        {
          type: 'input',
          name: 'fontsize',
          label: 'Font size (em)',
        },
        {
          type: 'textarea',
          name: 'formula',
          label: 'KaTeX formula',
        },
      ],
    },
    buttons: [
      { type: 'cancel', text: 'Close' },
      { type: 'submit', text: 'Save', primary: true },
    ],
    onSubmit: function (api: any) {
      const data = api.getData();
      updateKatexDiv(editor, data.formula, data.fontsize, katexRootElement);
      api.close();
    },
  });
}

function insertKatexDiv(editor: any) {
  const root = document.createElement('div');
  const p = document.createElement('p');
  const baseId = `${Date.now()}`;
  const txt = 'c = \\pm\\sqrt{a^2 + b^2}';
  const fontSize = '1.2';
  p.id = `katexDialog_${baseId}`;
  p.setAttribute('class', 'JoplinKatex');
  p.innerText = `\\[ ${txt} \\]`;
  root.id = `katexJoplinRoot_${baseId}`;
  root.setAttribute('katexTxt', txt);
  root.setAttribute('katexFontsize', fontSize);
  root.appendChild(p);
  editor.selection.setNode(root);
  const el = editor.dom.select(`p#${p.id}`)[0];
  removeNextSiblingBr(el, editor);
  removeInnerBr(el, editor);
  removeNextSiblingBr(editor.dom.select(`div#${root.id}`)[0], editor);
  const range = document.createRange();
  range.setStart(el, 0);
  range.setEnd(el, 0);
  editor.selection.setRng(range);
  editor.nodeChanged();
  editor.focus();
  editor.getDoc().dispatchEvent(
    new CustomEvent('joplin-kartexUpdate', {
      detail: { id: root.id, fontSize, element: editor.dom.select(`div#${root.id}`)[0] },
    })
  );
}

// ---------- ヘルパー: Drag & Drop ファイルアップロード ----------

/** ファイル名の拡張子が動画形式かどうかを判定する。 */
function isVideoFile(filename: string): boolean {
  const videoExtList = ['.mp4', '.webm', '.ogv', '.m4v', '.mov', '.mkv'];
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return videoExtList.includes(ext);
}

/** ファイル名の拡張子が音声形式かどうかを判定する。 */
function isAudioFile(filename: string): boolean {
  const audioExtList = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return audioExtList.includes(ext);
}

/** HTML 特殊文字をエスケープする（XSS 対策）。 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * ドロップされたファイルを PUT /api/resource/{filename} でアップロードし、
 * 成功したら画像は <img>、その他は <a> タグとしてエディタに挿入する。
 */
async function uploadAndInsertFile(file: File, editor: any): Promise<void> {
  try {
    const res = await fetch(`/api/resource/${encodeURIComponent(file.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    const json = await res.json();
    if (!json.success) {
      console.error('TinyMCEBody: upload failed', json.error);
      return;
    }
    // URL は encodeURIComponent 済み、表示名は escapeHtml でエスケープ
    const url = `/api/resource/${encodeURIComponent(json.filename as string)}`;
    const safeName = escapeHtml(file.name);
    if (file.type.startsWith('image/')) {
      editor.insertContent(`<img src="${url}" alt="${safeName}" />`);
    } else if (isVideoFile(json.filename as string)) {
      editor.insertContent(`<video controls src="${url}" title="${safeName}"></video>`);
    } else if (isAudioFile(json.filename as string)) {
      editor.insertContent(`<audio controls src="${url}" title="${safeName}"></audio>`);
    } else {
      editor.insertContent(`<a href="${url}">${safeName}</a>`);
    }
  } catch (err) {
    console.error('TinyMCEBody: upload error', err);
  }
}

/**
 * TinyMCE の drop イベントハンドラ。
 * ブラウザのデフォルト動作と TinyMCE 組み込み処理を抑制し、
 * DataTransfer に含まれるファイルを順にアップロードしてエディタへ挿入する。
 */
async function handleEditorDrop(e: DragEvent, editor: any): Promise<void> {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  for (const file of Array.from(files)) {
    await uploadAndInsertFile(file, editor);
  }
}

// ---------- ヘルパー: エディタコンテンツ取得 ----------

/**
 * TinyMCE の getContent() は <br data-mce-bogus="1"> を \n に変換してしまうため、
 * getBody().innerHTML から直接取得し、TinyMCE 内部属性のみを除去する。
 * これにより Shift+Enter や <pre> ブロック内の <br> がそのまま保持される。
 */
function getEditorContent(editor: any): string {
  const body = editor.getBody() as HTMLElement;
  const clone = body.cloneNode(true) as HTMLElement;

  // data-mce-bogus="all" の要素（UI 装飾など）は丸ごと削除
  clone.querySelectorAll('[data-mce-bogus="all"]').forEach((el) => el.remove());

  // 残要素から data-mce-* 内部属性を除去
  // （data-mce-bogus="1" の <br> は属性除去後 <br> として保持される）
  clone.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes)
      .filter((attr) => attr.name.startsWith('data-mce-'))
      .forEach((attr) => el.removeAttribute(attr.name));
  });

  return clone.innerHTML;
}

// ---------- ヘルパー: カスタムツールバーボタン登録 ----------

function setupToolbarButtons(editor: any) {
  const defs = [
    { name: 'joplinHighlight', tooltip: 'Highlight', icon: 'highlight-bg-color' },
    { name: 'joplinStrikethrough', tooltip: 'Strikethrough', icon: 'strike-through' },
    { name: 'joplinInsert', tooltip: 'Insert', icon: 'underline', grouped: true },
    { name: 'joplinSup', tooltip: 'Superscript', icon: 'superscript', grouped: true },
    { name: 'joplinSub', tooltip: 'Subscript', icon: 'subscript', grouped: true },
  ];
  for (const def of defs) {
    editor.ui.registry.addToggleButton(def.name, {
      tooltip: def.tooltip,
      icon: def.icon,
      onAction: () => editor.execCommand('mceToggleFormat', false, def.name),
      onSetup: (api: any) => {
        editor.formatter.formatChanged(def.name, (state: boolean) => api.setActive(state));
      },
    });
  }
  editor.ui.registry.addGroupToolbarButton('formattingExtras', {
    icon: 'image-options',
    items: defs
      .filter((d) => d.grouped)
      .map((d) => d.name)
      .join(' '),
  });
}

interface TinyMCEBodyProps {
  html: string;
  noteId: string | null;
  readOnly?: boolean;
}

export default function TinyMCEBody({ html, noteId, readOnly = true }: TinyMCEBodyProps) {
  const rootIdRef = useRef<string>(
    `tinymce-web-${Date.now()}-${Math.round(Math.random() * 10000)}`
  );
  const editorRef = useRef<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDirtyDialog, setShowDirtyDialog] = useState(false);
  const [pendingNote, setPendingNote] = useState<{ noteId: string | null; html: string } | null>(
    null
  );

  // isDirty の最新値を副作用外から参照するための ref
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 現在エディタに表示中のノート ID を追跡する ref
  const currentNoteIdRef = useRef<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!noteId || !editorRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const content = getEditorContent(editorRef.current);
      const res = await fetch('/api/note', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, body: content }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        console.error('Save failed:', json.error);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, isSaving]);

  // スタレクロージャを防ぐため、常に最新の handleSave を ref に保持
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // ページ離脱時（ブラウザ更新・タブ閉じなど）に未保存変更を警告する
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // エディタにノートコンテンツを適用するヘルパー
  const applyNoteContent = useCallback((newNoteId: string | null, newHtml: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.setContent(preserveHtmlIndent(newHtml ?? ''));
    editor.undoManager.reset();
    setIsDirty(false);
    setSaved(false);
    currentNoteIdRef.current = newNoteId;
    setTimeout(() => {
      editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
    }, 200);
    triggerKatexRender(editor, 600);
  }, []);

  // ダーティ確認ダイアログで「続行」を選択したとき
  const handleDirtyDialogConfirm = useCallback(() => {
    setShowDirtyDialog(false);
    if (pendingNote) {
      applyNoteContent(pendingNote.noteId, pendingNote.html);
      setPendingNote(null);
    }
  }, [pendingNote, applyNoteContent]);

  // ダーティ確認ダイアログで「キャンセル」を選択したとき（画面遷移を停止）
  const handleDirtyDialogCancel = useCallback(() => {
    setShowDirtyDialog(false);
    setPendingNote(null);
  }, []);

  // TinyMCE エディタの初期化
  useEffect(() => {
    let destroyed = false;
    const editorId = rootIdRef.current;

    tinymce
      .init({
        selector: `#${editorId}`,
        license_key: `gpl`,
        base_url: '/tinymce',
        suffix: '.min',
        width: '100%',
        height: '100%',
        min_height: 400,
        resize: false,
        menubar: false,
        statusbar: false,
        branding: false,
        readonly: readOnly,
        plugins: 'link lists table codesample',
        toolbar: readOnly
          ? false
          : [
              'bold italic joplinHighlight joplinStrikethrough formattingExtras |',
              'link joplinInlineCode codesample |',
              'bullist numlist joplinChecklist |',
              'h1 h2 h3 hr blockquote table |',
              'fontfamily fontsize blocks |',
              'forecolor backcolor removeformat |',
              'cmd mermaid katexMath toc',
            ].join(' '),
        valid_elements: '*[*]',
        relative_urls: false,
        content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            padding: 16px 24px;
            margin: 0;
          }
          pre {
            background: #f4f4f4;
            border-radius: 4px;
            padding: 8px;
            overflow: auto;
            font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
            font-size: 13px;
          }
          code { font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
          img { max-width: 100%; }
          a { color: #1a73e8; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 6px 10px; }
        `,
        font_family_formats:
          'System UI=-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
          'Monospace=Menlo,Monaco,Consolas,"Courier New",monospace;' +
          'Arial=arial,helvetica,sans-serif;' +
          'Georgia=georgia,palatino,serif;' +
          'Verdana=verdana,geneva,sans-serif;',
        font_size_formats: '8pt 10pt 11pt 12pt 14pt 16pt 18pt 24pt 36pt',
        formats: {
          joplinHighlight: { inline: 'mark', remove: 'all' },
          joplinStrikethrough: { inline: 's', remove: 'all' },
          joplinInsert: { inline: 'ins', remove: 'all' },
          joplinSup: { inline: 'sup', remove: 'all' },
          joplinSub: { inline: 'sub', remove: 'all' },
        },
        setup: (editor: any) => {
          editor.on('init', () => {
            if (!destroyed) {
              editorRef.current = editor;
              injectMermaidScripts(editor);
              injectKatexScripts(editor);
              editor.setContent(preserveHtmlIndent(html ?? ''));
              editor.undoManager.reset();
              setEditorReady(true);
              // コンテンツ読み込み後に mermaid レンダリングをトリガー
              setTimeout(() => {
                editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
              }, 200);
              // コンテンツ読み込み後に KaTeX 数式をレンダリング
              triggerKatexRender(editor, 600);
            }
          });

          // クリップボードの生 HTML をそのまま挿入してシンタックスハイライトを保持する
          editor.on('paste', (e: ClipboardEvent) => {
            const clipboardData = e.clipboardData;
            if (!clipboardData) return;
            const pastedHtml = clipboardData.getData('text/html');
            if (!pastedHtml) return;
            e.preventDefault();
            editor.execCommand('mceInsertContent', false, preserveHtmlIndent(pastedHtml));
          });

          // Drag & Drop によるファイルアップロード
          editor.on('drop', (e: DragEvent) => handleEditorDrop(e, editor));

          // Mermaid / KaTeX ブロックをダブルクリックしたらダイアログを開く
          editor.on('DblClick', (e: any) => {
            let target = e.target as HTMLElement | null;
            while (target) {
              if (target.id && target.id.split('_')[0] === 'mermaidJoplinRoot') {
                const dialogTxt = target.getAttribute('mermaidTxt') ?? '';
                openMermaidDialog(editor, dialogTxt, target);
                return;
              }
              if (target.id && target.id.split('_')[0] === 'katexJoplinRoot') {
                const katexTxt = target.getAttribute('katexTxt') ?? '';
                const fontsize = target.getAttribute('katexFontsize') ?? '1.2';
                openKatexDialog(editor, katexTxt, fontsize, target);
                return;
              }
              target = target.parentElement;
            }
          });

          // カスタムフォーマット/トグルボタン群を登録
          setupToolbarButtons(editor);

          // 編集変更の追跡（ダーティ状態）
          if (!readOnly) {
            editor.on('input change', () => {
              setIsDirty(true);
            });
          }

          // joplinInlineCode: code 書式トグル
          editor.ui.registry.addToggleButton('joplinInlineCode', {
            tooltip: 'Inline Code',
            icon: 'sourcecode',
            onAction: () => editor.execCommand('mceToggleFormat', false, 'code'),
            onSetup: (api: any) => {
              editor.formatter.formatChanged('code', (state: boolean) => api.setActive(state));
            },
          });

          // joplinChecklist: チェックボックスリスト挿入
          editor.ui.registry.addToggleButton('joplinChecklist', {
            tooltip: 'Checklist',
            icon: 'checklist',
            onAction: () => {
              editor.insertContent(
                '<ul style="list-style:none;padding-left:0">' +
                  '<li><input type="checkbox" />&nbsp;</li>' +
                  '</ul>'
              );
            },
            onSetup: (api: any) => {
              api.setActive(false);
            },
          });

          // cmd: <pre> コードブロック挿入
          editor.ui.registry.addToggleButton('cmd', {
            tooltip: 'Command / Code block',
            text: 'Cmd',
            onAction: () => insertCommandPre(editor),
            onSetup: (api: any) => {
              api.setActive(editor.formatter.match('pre'));
              const unbind = editor.formatter.formatChanged('pre', api.setActive).unbind;
              return () => {
                if (unbind) unbind();
              };
            },
          });

          // mermaid: Mermaid ダイアグラム挿入
          editor.ui.registry.addToggleButton('mermaid', {
            tooltip: 'Mermaid diagram',
            text: '図',
            onAction: () => insertMermaidDiv(editor),
            onSetup: (api: any) => {
              api.setActive(false);
            },
          });

          // katexMath: KaTeX 数式挿入
          editor.ui.registry.addToggleButton('katexMath', {
            tooltip: 'KaTeX Math',
            text: '式',
            onAction: () => insertKatexDiv(editor),
            onSetup: (api: any) => {
              api.setActive(false);
            },
          });

          // toc: 目次挿入
          editor.ui.registry.addButton('toc', {
            tooltip: 'Insert Table of Contents',
            text: 'ToC',
            onAction: () => insertToc(editor),
          });

          // ---------- カスタムコマンド ----------

          // 文字色コマンド
          editor.addCommand('text_color_command_w', function () {
            const node = editor.selection.getNode();
            const color = editor.dom.getStyle(node, 'color', true);
            console.log(color);
            editor.execCommand('ForeColor', false, '#FFFFFF');
          });
          editor.addCommand('text_color_command_r', function () {
            const node = editor.selection.getNode();
            const color = editor.dom.getStyle(node, 'color', true);
            console.log(color);
            editor.execCommand('ForeColor', false, '#FF0000');
          });
          editor.addCommand('text_color_command_g', function () {
            const node = editor.selection.getNode();
            const color = editor.dom.getStyle(node, 'color', true);
            console.log(color);
            editor.execCommand('ForeColor', false, 'rgb(22, 145, 121)');
          });
          editor.addCommand('text_color_command_b', function () {
            const node = editor.selection.getNode();
            const color = editor.dom.getStyle(node, 'color', true);
            console.log(color);
            editor.execCommand('ForeColor', false, 'rgb(35, 111, 161)');
          });
          editor.addCommand('text_color_command_h', function () {
            const node = editor.selection.getNode();
            const color = editor.dom.getStyle(node, 'color', true);
            console.log(color);
            editor.execCommand('ForeColor', false, 'rgb(52, 73, 94)');
          });

          // フォントサイズコマンド
          editor.addCommand('text_size_command_8', function () {
            const node = editor.selection.getNode();
            const fontSize = editor.dom.getStyle(node, 'font-size', true);
            console.log(fontSize);
            editor.dom.setStyle(node, 'font-size', '8pt');
          });
          editor.addCommand('text_size_command_10', function () {
            const node = editor.selection.getNode();
            const fontSize = editor.dom.getStyle(node, 'font-size', true);
            console.log(fontSize);
            editor.dom.setStyle(node, 'font-size', '10pt');
          });

          // ブロック変換コマンド
          editor.addCommand('change_to_h1', function () {
            editor.execCommand('FormatBlock', false, 'h1');
          });
          editor.addCommand('change_to_h2', function () {
            editor.execCommand('FormatBlock', false, 'h2');
          });
          editor.addCommand('change_to_h3', function () {
            editor.execCommand('FormatBlock', false, 'h3');
          });
          editor.addCommand('change_to_ul', function () {
            editor.execCommand('InsertUnorderedList');
          });
          editor.addCommand('change_to_ol', function () {
            editor.execCommand('InsertOrderedList');
          });

          // ---------- ショートカットキー ----------
          editor.addShortcut('meta+shift+b', 'Insert pre element', function () {
            console.log('meta+shift+b ==> commandline');
            insertCommandPre(editor);
          });
          editor.addShortcut('ctrl+w', 'White', 'text_color_command_w');
          editor.addShortcut('meta+shift+r', 'Red', 'text_color_command_r');
          editor.addShortcut('meta+shift+g', 'Green', 'text_color_command_g');
          editor.addShortcut('meta+shift+p', 'Blue', 'text_color_command_b');
          editor.addShortcut('meta+shift+h', 'Dark', 'text_color_command_h');
          editor.addShortcut('meta+shift+e', 'Size 8pt', 'text_size_command_8');
          editor.addShortcut('meta+shift+j', 'Size 10pt', 'text_size_command_10');
          editor.addShortcut('meta+1', 'H1', 'change_to_h1');
          editor.addShortcut('meta+2', 'H2', 'change_to_h2');
          editor.addShortcut('meta+3', 'H3', 'change_to_h3');
          editor.addShortcut('meta+shift+u', '箇条書き', 'change_to_ul');
          editor.addShortcut('meta+shift+o', '番号付き箇条書き', 'change_to_ol');
          editor.addShortcut('meta+s', '保存', () => handleSaveRef.current());
          editor.addShortcut('ctrl+s', '保存', () => handleSaveRef.current());

          // ---------- 変更時に目次を自動更新するコールバック (execOnChangeEvent に相当) ----------
          setupTocAutoUpdate(editor);
        },
      })
      .catch((err: any) => {
        console.error('TinyMCEBody: tinymce.init failed', err);
      });

    return () => {
      destroyed = true;
      setEditorReady(false);
      try {
        if (editorRef.current) {
          editorRef.current.destroy();
        } else {
          // StrictMode などで init イベント前に cleanup が走った場合、
          // セレクタ経由で削除して次回の init が失敗しないようにする
          tinymce.remove(`#${editorId}`);
        }
      } catch (_) {
        // ignore errors on cleanup
      }
      editorRef.current = null;
    };
    // readOnly は初期化時にのみ参照するため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ノートコンテンツのセット（noteId または html が変わったとき）
  useEffect(() => {
    if (!editorReady || !editorRef.current) return;

    // ノートが切り替わり、かつ未保存の変更がある場合はダイアログで確認する
    if (isDirtyRef.current && noteId !== currentNoteIdRef.current) {
      setPendingNote({ noteId, html });
      setShowDirtyDialog(true);
      return;
    }

    applyNoteContent(noteId, html);
  }, [editorReady, noteId, html, applyNoteContent]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <textarea id={rootIdRef.current} defaultValue="" />
      {!readOnly && (
        <Tooltip title={saved ? '保存しました' : '保存 (Cmd+S)'} placement="left">
          <span style={{ position: 'absolute', bottom: 20, right: 20 }}>
            <Fab
              color={saved ? 'success' : isDirty ? 'primary' : 'default'}
              size="medium"
              disabled={isSaving || (!isDirty && !saved)}
              onClick={handleSave}
              aria-label="保存"
            >
              {isSaving ? (
                <CircularProgress size={24} color="inherit" />
              ) : saved ? (
                <CheckIcon />
              ) : (
                <SaveIcon />
              )}
            </Fab>
          </span>
        </Tooltip>
      )}

      {/* 未保存変更があるときのノート切り替え確認ダイアログ */}
      <Dialog open={showDirtyDialog} onClose={handleDirtyDialogCancel}>
        <DialogTitle>未保存の変更があります</DialogTitle>
        <DialogContent>
          <DialogContentText>
            現在のノートに保存されていない変更があります。このまま移動すると変更が失われます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDirtyDialogCancel}>キャンセル</Button>
          <Button onClick={handleDirtyDialogConfirm} color="error" variant="contained">
            続行（変更を破棄）
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
