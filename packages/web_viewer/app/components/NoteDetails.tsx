'use client';

import React from 'react';
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{note.title || 'Untitled'}</h2>
        {note.body ? (
          <div 
            className="note-content"
            dangerouslySetInnerHTML={{ __html: note.body }} 
          />
        ) : (
          <div className="text-sm text-gray-600">-</div>
        )}
    </div>
  );
}
