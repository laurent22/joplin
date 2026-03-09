'use client';

import React, { useEffect, useRef, useState } from 'react';
import tinymce from 'tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';

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
        plugins: 'link lists table',
        toolbar: readOnly ? false : 'bold italic | link | bullist numlist | h1 h2 h3 | blockquote',
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
        setup: (editor: any) => {
          editor.on('init', () => {
            if (!destroyed) {
              editorRef.current = editor;
              editor.setContent(html ?? '');
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

            // VSCode からコピーした HTML はインデントを通常スペースで表現するため、
            // HTML レンダリング時に連続スペースが折り畳まれてしまう。
            // テキストノードの連続スペースをノーブレークスペース(\u00A0)に変換して保持する。
            const doc = new DOMParser().parseFromString(pastedHtml, 'text/html');
            const preserveSpaces = (node: Node): void => {
              if (node.nodeType === Node.TEXT_NODE) {
                node.textContent =
                  node.textContent?.replace(/ {2,}/g, (m) => '\u00A0'.repeat(m.length)) ?? '';
              } else {
                node.childNodes.forEach(preserveSpaces);
              }
            };
            preserveSpaces(doc.body);

            editor.execCommand('mceInsertContent', false, doc.body.innerHTML);
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
    editor.setContent(html ?? '');
    editor.undoManager.reset();
  }, [editorReady, noteId, html]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <textarea id={rootIdRef.current} defaultValue="" />
    </div>
  );
}
