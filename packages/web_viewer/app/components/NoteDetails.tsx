'use client';

import React from 'react';
import { NoteEntity } from '@/lib/database';

function fmtTime(ts?: number) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function NoteDetails({ note }: { note: (NoteEntity & { body?: string }) | null }) {
  if (!note) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">No note selected</h2>
        <p className="text-sm text-gray-500">ダブルクリックでノートを選択してください。</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">{note.title || 'Untitled'}</h2>
        {note.body ? (
          <div  dangerouslySetInnerHTML={{ __html: note.body }} />
        ) : (
          <div className="text-sm text-gray-600">-</div>
        )}
    </div>
  );
}
