'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TinyMCEBodyProps {
  html: string;
  noteId: string | null;
  readOnly?: boolean;
}

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const TINYMCE_CDN_URL = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/7/tinymce.min.js';

function loadTinyMCEScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).tinymce) {
      resolve();
      return;
    }
    const existing = document.getElementById(TINYMCE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load TinyMCE')));
      return;
    }
    const script = document.createElement('script');
    script.id = TINYMCE_SCRIPT_ID;
    script.src = TINYMCE_CDN_URL;
    script.referrerPolicy = 'origin';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TinyMCE script'));
    document.head.appendChild(script);
  });
}

export default function TinyMCEBody({ html, noteId, readOnly = true }: TinyMCEBodyProps) {
  const rootIdRef = useRef<string>(
    `tinymce-web-${Date.now()}-${Math.round(Math.random() * 10000)}`
  );
  const editorRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  // TinyMCE スクリプトのロード
  useEffect(() => {
    let cancelled = false;
    loadTinyMCEScript()
      .then(() => {
        if (!cancelled) setScriptLoaded(true);
      })
      .catch((err) => {
        console.error('TinyMCEBody: failed to load TinyMCE', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // TinyMCE エディタの初期化
  useEffect(() => {
    if (!scriptLoaded) return;

    const tinymce = (window as any).tinymce;
    if (!tinymce) return;

    let destroyed = false;
    const editorId = rootIdRef.current;

    tinymce
      .init({
        selector: `#${editorId}`,
        width: '100%',
        height: '100%',
        resize: false,
        menubar: false,
        statusbar: false,
        branding: false,
        readonly: readOnly,
        plugins: 'link lists hr table',
        toolbar: readOnly
          ? false
          : 'bold italic | link | bullist numlist | h1 h2 h3 | blockquote',
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
              setEditorReady(true);
            }
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
        }
      } catch (_) {
        // ignore errors on cleanup
      }
      editorRef.current = null;
    };
    // readOnly は初期化時にのみ参照するため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  // ノートコンテンツのセット（noteId または html が変わったとき）
  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    const editor = editorRef.current;
    editor.setContent(html ?? '');
    editor.undoManager.reset();
  }, [editorReady, noteId, html]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <textarea id={rootIdRef.current} defaultValue="" />
    </div>
  );
}
