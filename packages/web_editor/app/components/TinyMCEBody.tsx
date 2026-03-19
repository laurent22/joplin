'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import tinymce from 'tinymce';
import { insertToc, setupTocAutoUpdate, updateToc } from './tocPlugin';
import { marked } from 'marked';
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

// ---------- ヘルパー: Markdown 挿入ダイアログ ----------

/**
 * Markdown テキストを HTML に変換する。
 */
function convertMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

/**
 * Markdown 入力ダイアログを TinyMCE の windowManager で開き、
 * OK 時にカーソル位置へ HTML を挿入する。
 */
function openMarkdownInsertDialog(editor: any) {
  // ダイアログを開く前にカーソル位置を bookmark として保存する
  const bookmark = editor.selection.getBookmark(2, true);

  editor.windowManager.open({
    title: 'Insert Markdown',
    size: 'large',
    initialData: {
      markdown: '',
    },
    body: {
      type: 'panel',
      items: [
        {
          type: 'textarea',
          name: 'markdown',
          label: 'Markdown',
        },
      ],
    },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'OK', primary: true },
    ],
    onSubmit: function (api: any) {
      const data = api.getData();
      if (data.markdown && data.markdown.trim()) {
        // bookmark を復元してカーソル位置を確定する
        editor.selection.moveToBookmark(bookmark);
        const html = convertMarkdownToHtml(data.markdown);
        editor.execCommand('mceInsertContent', false, html);
      }
      api.close();
    },
  });
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

  // audio 設定ボタンとラッパーを除去
  stripAudioSettingsButtons(clone);

  return clone.innerHTML;
}

// ---------- ヘルパー: Audio 設定ボタン ----------

/**
 * エディタ内の全 <audio> 要素に設定ボタン (⚙) をオーバーレイする。
 * audio のネイティブコントロールはブラウザの Shadow DOM で描画されるため、
 * click / dblclick イベントがホスト要素までバブルしない。
 * そのため、audio 要素を <span> でラップし、その中にクリック可能な
 * 設定ボタンを配置することでダイアログを開けるようにする。
 */
function attachAudioSettingsButtons(editor: any): void {
  const body = editor.getBody() as HTMLElement;
  if (!body) return;
  body.querySelectorAll('audio').forEach((audio) => {
    // 既にラップ済みなら処理をスキップ
    if (audio.parentElement?.classList.contains('joplin-audio-wrapper')) return;
    // <span class="joplin-audio-wrapper"> でラップ
    const wrapper = editor.getDoc().createElement('span');
    wrapper.className = 'joplin-audio-wrapper';
    wrapper.setAttribute('contenteditable', 'true');
    audio.parentNode?.insertBefore(wrapper, audio);
    wrapper.appendChild(audio);
    // 設定ボタンを追加
    const btn = editor.getDoc().createElement('button');
    btn.className = 'joplin-audio-settings-btn';
    btn.setAttribute('title', '音声設定');
    btn.setAttribute('contenteditable', 'false');
    btn.textContent = '⚙';
    wrapper.appendChild(btn);
  });
}

/**
 * 保存前にエディタ内から audio 設定ボタンとラッパーを除去したクリーンな HTML を得る。
 * getEditorContent の clone に対して呼び出す。
 */
function stripAudioSettingsButtons(clone: HTMLElement): void {
  // 設定ボタンを除去
  clone.querySelectorAll('.joplin-audio-settings-btn').forEach((btn) => btn.remove());
  // ラッパー <span> をアンラップ（子要素を親に戻す）
  clone.querySelectorAll('.joplin-audio-wrapper').forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  });
}

// ---------- ヘルパー: Video / Audio ダイアログ ----------

/**
 * video・audio 要素の data-starttime / data-endtime / data-loop 属性から
 * 再生開始秒・終了秒・ループフラグを取得する。
 */
function parseMediaAttributes(element: HTMLElement): {
  startTime: number;
  endTime: number;
  loop: boolean;
  width: string;
  height: string;
} {
  const startRaw = element.getAttribute('data-starttime');
  const endRaw = element.getAttribute('data-endtime');
  const loopRaw = element.getAttribute('data-loop');

  const startTime = startRaw !== null ? parseFloat(startRaw) : -1;
  const endTime = endRaw !== null ? parseFloat(endRaw) : -1;
  const loop = loopRaw === 'true';
  // audio の width / height は属性から読み取る
  const width = element.getAttribute('width') ?? '';
  const height = element.getAttribute('height') ?? '';

  return { startTime, endTime, loop, width, height };
}

/**
 * 設定を data-starttime / data-endtime / data-loop 属性に書き込み、
 * さらに onplay / ontimeupdate も同期する。
 * startTime / endTime が -1 の場合は対応する属性を削除する。
 */
function applyMediaAttributes(
  editor: any,
  element: HTMLElement,
  startTime: number,
  endTime: number,
  loop: boolean,
  width?: string,
  height?: string
): void {
  // width / height は audio 要素の場合、style と width/height 属性の両方に設定する。
  // style は実際の表示に使用する。
  // width/height 属性は NoteDetails で属性から小設な変換なしに style を構築するために使用する。
  // 純粋な数値のみの場合は px を自動付与する。
  const normalizeCssSize = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
  };
  if (width !== undefined) {
    const w = normalizeCssSize(width);
    element.style.width = w;
    // 属性は元の入力展文字列を保存（NoteDetails で指定値れそのまま参照できるように）
    editor.dom.setAttrib(element, 'width', w || null);
  }
  if (height !== undefined) {
    const h = normalizeCssSize(height);
    element.style.height = h;
    editor.dom.setAttrib(element, 'height', h || null);
  }

  // data-* 属性を更新（値が -1 なら削除）
  if (startTime >= 0) {
    editor.dom.setAttrib(element, 'data-starttime', String(startTime));
  } else {
    editor.dom.setAttrib(element, 'data-starttime', null);
  }
  if (endTime >= 0) {
    editor.dom.setAttrib(element, 'data-endtime', String(endTime));
  } else {
    editor.dom.setAttrib(element, 'data-endtime', null);
  }
  editor.dom.setAttrib(element, 'data-loop', loop ? 'true' : null);

  // onplay / ontimeupdate も同期して TinyMCE 外（素の HTML コピーなど）でも動くようにする
  editor.dom.setAttrib(element, 'onplay', null);
  editor.dom.setAttrib(element, 'ontimeupdate', null);

  if (startTime >= 0 && endTime >= 0) {
    const onplay = `this.currentTime=${startTime}`;
    const ontimeupdate = loop
      ? `if(this.currentTime>=${endTime}){this.currentTime=${startTime}}`
      : `if(this.currentTime>=${endTime}){this.pause();this.currentTime=${startTime}}`;
    editor.dom.setAttrib(element, 'onplay', onplay);
    editor.dom.setAttrib(element, 'ontimeupdate', ontimeupdate);
  } else if (startTime >= 0) {
    editor.dom.setAttrib(element, 'onplay', `this.currentTime=${startTime}`);
  }

  editor.nodeChanged();
}

/**
 * video / audio 要素をダブルクリックしたときに開くダイアログ。
 * 再生開始秒・終了秒・ループの設定を行う。
 */
function openMediaDialog(editor: any, mediaElement: HTMLElement): void {
  const { startTime, endTime, loop, width, height } = parseMediaAttributes(mediaElement);
  const tagName = mediaElement.tagName.toLowerCase();
  const isAudio = tagName === 'audio';
  const title = isAudio ? '音声設定' : '動画設定';

  const commonItems = [
    {
      type: 'input',
      name: 'startTime',
      label: '再生開始(秒)  ※未指定は空欄',
    },
    {
      type: 'input',
      name: 'endTime',
      label: '再生終了(秒)  ※未指定は空欄',
    },
    {
      type: 'checkbox',
      name: 'loop',
      label: 'ループ再生',
    },
  ];

  const audioSizeItems = isAudio
    ? [
        {
          type: 'input',
          name: 'width',
          label: '横幅 (width)  ※例: 300 または 100%  未指定は空欄',
        },
        {
          type: 'input',
          name: 'height',
          label: '高さ (height)  ※例: 54  未指定は空欄',
        },
      ]
    : [];

  const initialData: Record<string, string | boolean> = {
    startTime: startTime >= 0 ? String(startTime) : '',
    endTime: endTime >= 0 ? String(endTime) : '',
    loop,
  };
  if (isAudio) {
    initialData.width = width;
    initialData.height = height;
  }

  editor.windowManager.open({
    title,
    initialData,
    body: {
      type: 'panel',
      items: [...commonItems, ...audioSizeItems],
    },
    buttons: [
      { type: 'cancel', text: 'キャンセル' },
      { type: 'submit', text: 'OK', primary: true },
    ],
    onSubmit: function (api: any) {
      const data = api.getData();
      const startVal =
        typeof data.startTime === 'string' && data.startTime.trim() !== ''
          ? parseFloat(data.startTime)
          : -1;
      const endVal =
        typeof data.endTime === 'string' && data.endTime.trim() !== ''
          ? parseFloat(data.endTime)
          : -1;
      const loopVal = data.loop as boolean;
      const widthVal = isAudio ? (data.width as string) : undefined;
      const heightVal = isAudio ? (data.height as string) : undefined;
      applyMediaAttributes(editor, mediaElement, startVal, endVal, loopVal, widthVal, heightVal);
      api.close();
    },
  });
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
  updatedTime?: number;
}

export default function TinyMCEBody({
  html,
  noteId,
  readOnly = true,
  updatedTime,
}: TinyMCEBodyProps) {
  const router = useRouter();
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
  const [conflictError, setConflictError] = useState(false);

  // attachAudioSettingsButtons 実行中はダーティ検知を抑制するための ref
  const suppressDirtyRef = useRef(false);

  // isDirty の最新値を副作用外から参照するための ref
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 現在エディタに表示中のノート ID を追跡する ref
  const currentNoteIdRef = useRef<string | null>(null);

  // コンフリクト判定用の updatedTime を ref で管理する。
  // ・ノート切り替え時は props の値に同期する
  // ・保存成功時はサーバーが返した最新値に更新する
  const currentUpdatedTimeRef = useRef<number | undefined>(updatedTime);
  useEffect(() => {
    currentUpdatedTimeRef.current = updatedTime;
  }, [noteId, updatedTime]);

  const handleSave = useCallback(
    async (editor: any) => {
      updateToc(editor);
      if (!noteId || !editorRef.current || isSaving) return;
      setIsSaving(true);
      try {
        const content = getEditorContent(editorRef.current);
        const res = await fetch('/api/note', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: noteId,
            body: content,
            updatedTime: currentUpdatedTimeRef.current,
          }),
        });
        const json = await res.json();
        if (json.success) {
          currentUpdatedTimeRef.current = json.updatedTime;
          setIsDirty(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else if (json.conflict) {
          setConflictError(true);
        } else {
          console.error('Save failed:', json.error);
        }
      } catch (err) {
        console.error('Save error:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [noteId, isSaving]
  );

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
    // URL を元のノートに戻す
    if (currentNoteIdRef.current) {
      router.replace(`/note?note_id=${currentNoteIdRef.current}`);
    }
  }, [router]);

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
              'cmd mermaid katexMath toc markdownInsert',
            ].join(' '),
        valid_elements: '*[*]',
        relative_urls: false,
        content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 20px;
            line-height: 1.8;
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
          .joplin-audio-wrapper {
            position: relative;
            display: inline-block;
          }
          .joplin-audio-settings-btn {
            position: absolute;
            top: 2px;
            right: 2px;
            z-index: 10;
            background: rgba(0, 0, 0, 0.55);
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            cursor: pointer;
            font-size: 13px;
            line-height: 22px;
            text-align: center;
            padding: 0;
            opacity: 0.7;
            transition: opacity 0.15s;
          }
          .joplin-audio-settings-btn:hover {
            opacity: 1;
          }
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

              // video 要素のダブルクリックによるブラウザネイティブの全画面化を防ぐ。
              // dblclick の preventDefault() はネイティブメディアコントローラーには効かないため、
              // fullscreenchange を監視して video が全画面になったら即座に抜ける。
              const iframeDoc = editor.getDoc() as Document;
              iframeDoc.addEventListener('fullscreenchange', () => {
                const fsEl = iframeDoc.fullscreenElement;
                if (fsEl && fsEl.tagName?.toLowerCase() === 'video') {
                  iframeDoc.exitFullscreen().catch(() => {});
                }
              });

              // audio 要素に設定ボタン (⚙) をオーバーレイ
              attachAudioSettingsButtons(editor);

              // audio 設定ボタンのクリックを委譲ハンドラーで処理
              iframeDoc.addEventListener('click', (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                if (target?.classList?.contains('joplin-audio-settings-btn')) {
                  e.preventDefault();
                  e.stopPropagation();
                  const wrapper = target.closest('.joplin-audio-wrapper');
                  const audio = wrapper?.querySelector('audio');
                  if (audio) openMediaDialog(editor, audio);
                }
              });
            }
          });

          // クリップボードの生 HTML をそのまま挿入してシンタックスハイライトを保持する
          editor.on('paste', (e: ClipboardEvent) => {
            const clipboardData = e.clipboardData;
            if (!clipboardData) return;
            const pastedHtml = clipboardData.getData('text/html');
            if (!pastedHtml) return;
            e.preventDefault();
            const pasteDoc = new DOMParser().parseFromString(pastedHtml, 'text/html');

            // TinyMCE のシリアライザは Ctrl+C 時に data-mce-src の値で src を上書きして
            // クリップボードに書き込む。Joplin リソースの場合 data-mce-src が
            // "file:///...:/RESOURCE_HASH" 形式になるため、そのまま貼り付けると
            // src がローカルパスに置き換わり動画・画像が壊れる。
            // → src が Joplin リソースパターン（":/HASH"）に一致する要素を検出し、
            //    title 属性の拡張子と組み合わせて /api/resource/HASH.ext に修正する。
            pasteDoc.querySelectorAll('[src]').forEach((el) => {
              const src = el.getAttribute('src') ?? '';
              const resourceMatch = src.match(/:\/([\da-f]{32,})\s*$/i);
              if (resourceMatch) {
                const hash = resourceMatch[1];
                const title = el.getAttribute('title') ?? '';
                const extMatch = title.match(/(\.[^.]+)$/);
                const ext = extMatch ? extMatch[1] : '';
                el.setAttribute('src', `/api/resource/${hash}${ext}`);
              }
            });

            // href が絶対パスに変換されている <a> 要素を /api/resource/ に修正する。
            // TinyMCE は relative_urls: false により href を絶対 URL（file:// 等）に解決して
            // クリップボードへ書き込むため、data-mce-href に残っている元の相対 URL か
            // "file:///…/resources/HASH.ext" パターンから復元する。
            pasteDoc.querySelectorAll('a[href]').forEach((el) => {
              // data-mce-href に /api/resource/ パスが保存されていればそちらを優先
              const dataMceHref = el.getAttribute('data-mce-href') ?? '';
              if (dataMceHref.startsWith('/api/resource/')) {
                el.setAttribute('href', dataMceHref);
                return;
              }
              const href = el.getAttribute('href') ?? '';
              // "file:///…/resources/HASH.ext" パターン
              const fileMatch = href.match(/\/resources\/([\da-f]{32,}\.[^/?#\s]+)/i);
              if (fileMatch) {
                el.setAttribute('href', `/api/resource/${fileMatch[1]}`);
                return;
              }
              // ":/HASH" パターン（joplin_resource:// 形式）
              const colonMatch = href.match(/:\/([\da-f]{32,})(\.[^/?#\s]*)?/i);
              if (colonMatch) {
                const hash = colonMatch[1];
                const ext = colonMatch[2] ?? '';
                el.setAttribute('href', `/api/resource/${hash}${ext}`);
              }
            });

            // data-mce-* 内部属性を除去（再挿入時に TinyMCE が再適用するのを防ぐ）
            pasteDoc.querySelectorAll('*').forEach((el) => {
              Array.from(el.attributes)
                .filter((attr) => attr.name.startsWith('data-mce-'))
                .forEach((attr) => el.removeAttribute(attr.name));
            });

            editor.execCommand(
              'mceInsertContent',
              false,
              preserveHtmlIndent(pasteDoc.body.innerHTML)
            );
          });

          // Drag & Drop によるファイルアップロード
          editor.on('drop', (e: DragEvent) => handleEditorDrop(e, editor));

          // コンテンツ変更時に audio 設定ボタンを再適用
          editor.on('SetContent', () => {
            suppressDirtyRef.current = true;
            setTimeout(() => {
              attachAudioSettingsButtons(editor);
              suppressDirtyRef.current = false;
            }, 100);
          });

          // Mermaid / KaTeX / Video / Audio ブロックをダブルクリックしたらダイアログを開く
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
              const tagName = target.tagName?.toLowerCase();
              if (tagName === 'video' || tagName === 'audio') {
                e.preventDefault();
                openMediaDialog(editor, target);
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
              if (!suppressDirtyRef.current) {
                setIsDirty(true);
              }
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

          // markdownInsert: Markdown → HTML 変換して挿入
          editor.ui.registry.addButton('markdownInsert', {
            tooltip: 'Insert Markdown',
            text: 'MD',
            onAction: () => openMarkdownInsertDialog(editor),
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
          editor.addShortcut('meta+s', '保存', () => handleSaveRef.current(editor));
          editor.addShortcut('ctrl+s', '保存', () => handleSaveRef.current(editor));

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

    // キャンセルで元のノートに戻った場合など、同じノートを表示中かつ未保存の変更が
    // ある場合はエディタ内容を上書きしない
    if (isDirtyRef.current && noteId === currentNoteIdRef.current) {
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

      {/* 競合エラー Snackbar */}
      <Snackbar
        open={conflictError}
        autoHideDuration={6000}
        onClose={() => setConflictError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setConflictError(false)} sx={{ width: '100%' }}>
          ノートが他の場所で更新されています。リロードしてから再編集してください。
        </Alert>
      </Snackbar>

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
