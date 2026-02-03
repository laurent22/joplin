'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import parse, { domToReact, HTMLReactParserOptions, Element, DOMNode } from 'html-react-parser';
import { NoteEntity } from '@/lib/database';


export default function NoteDetails({ note }: { note: (NoteEntity & { body?: string }) | null }) {
  // コンテンツロード後にフラグメントジャンプを実行
  useEffect(() => {
    if (!note?.body) return;

    // URLのフラグメントを取得
    const hash = window.location.hash;
    if (!hash) return;

    // フラグメントに該当する要素を探してスクロール
    const elementId = hash.substring(1); // '#' を除去
    const targetElement = document.getElementById(elementId);
    
    if (targetElement) {
      // 少し遅延を入れることでDOMの完全なレンダリングを待つ
      setTimeout(() => {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 1000);
    }
  }, [note?.body]);

  if (!note) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">No note selected</h2>
        <p className="text-sm text-gray-500">ダブルクリックでノートを選択してください。</p>
      </div>
    );
  }

  // HTML内の<a>タグをNext.js Linkに変換する処理
  const parseOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // html, body, head タグはスキップして子要素だけをレンダリング
        if (domNode.name === 'html' || domNode.name === 'body' || domNode.name === 'head') {
          return <>{domToReact(domNode.children as DOMNode[], parseOptions)}</>;
        }
        
        if (domNode.name === 'a') {
          const href = domNode.attribs?.href;
          
          // 同一サーバ内のリンク（相対パスや / で始まる）の場合は Link に置き換え
          if (href && (href.startsWith('/') || !href.match(/^https?:\/\//))) {
            return (
              <Link href={href}>
                <span style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {domToReact(domNode.children as DOMNode[], parseOptions)}
                </span>
              </Link>
            );
          }
          
          // 外部リンクはそのまま <a> タグとして処理
          const { style, ...otherAttribs } = domNode.attribs || {};
          return (
            <a {...otherAttribs} target="_blank" rel="noopener noreferrer">
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </a>
          );
        }
      }
    },
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{note.title || 'Untitled'}</h2>
        {note.body ? (
          <div className="note-content">
            {parse(note.body, parseOptions)}
          </div>
        ) : (
          <div className="text-sm text-gray-600">-</div>
        )}
    </div>
  );
}
