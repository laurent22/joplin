'use client';

import React from 'react';
import Link from 'next/link';
import parse, { domToReact, HTMLReactParserOptions, Element, DOMNode } from 'html-react-parser';
import { NoteEntity } from '@/lib/database';


export default function NoteDetails({ note }: { note: (NoteEntity & { body?: string }) | null }) {
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
      if (domNode instanceof Element && domNode.name === 'a') {
        const href = domNode.attribs?.href;
        
        // 同一サーバ内のリンク（相対パスや / で始まる）の場合は Link に置き換え
        if (href && (href.startsWith('/') || !href.match(/^https?:\/\//))) {
          return (
            <Link href={href} style={{ color: 'inherit', textDecoration: 'underline' }}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </Link>
          );
        }
        
        // 外部リンクはそのまま <a> タグとして処理
        return (
          <a {...domNode.attribs} target="_blank" rel="noopener noreferrer">
            {domToReact(domNode.children as DOMNode[], parseOptions)}
          </a>
        );
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
