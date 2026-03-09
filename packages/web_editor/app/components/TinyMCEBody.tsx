'use client';

import React, { useEffect, useRef, useState } from 'react';
import tinymce from 'tinymce';
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

// ---------- ヘルパー: カスタムブロック挿入 ----------

function insertCommandPre(editor: any) {
  const preElement = document.createElement('pre');
  const preId = `${Date.now()}`;
  preElement.setAttribute(
    'style',
    'box-sizing:border-box;overflow:auto;font-family:Menlo,Monaco,Consolas,"Courier New",monospace;' +
      'font-size:11px;padding:8px;margin:0;line-height:1.42857;word-break:break-all;' +
      'overflow-wrap:break-word;color:rgb(157,165,180);background:rgb(49,54,63);' +
      'border:none;border-radius:3px;box-shadow:none;',
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
  dialog.innerText = txt;
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
    }),
  );
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
              'cmd mermaid katexMath',
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
              editor.setContent(preserveHtmlIndent(html ?? ''));
              editor.undoManager.reset();
              setEditorReady(true);
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

          // カスタムフォーマット/トグルボタン群を登録
          setupToolbarButtons(editor);

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
                  '</ul>',
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
    const editor = editorRef.current;
    editor.setContent(preserveHtmlIndent(html ?? ''));
    editor.undoManager.reset();
  }, [editorReady, noteId, html]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <textarea id={rootIdRef.current} defaultValue="" />
    </div>
  );
}
