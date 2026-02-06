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

export default function NoteAbst({ note }: { note: (NoteEntity & { body?: string }) | null }) {
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
      <h2 className="text-xl font-bold mb-2">{note.title || 'Untitled'}</h2>
      <div className="text-sm text-gray-600 mb-4">ID: {note.id}</div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium">Author</div>
          <div className="text-gray-700">{note.author || '-'}</div>
        </div>
        <div>
          <div className="font-medium">Source</div>
          <div className="text-gray-700">{note.source || '-'}</div>
        </div>

        <div>
          <div className="font-medium">Created</div>
          <div className="text-gray-700">{fmtTime(note.created_time)}</div>
        </div>
        <div>
          <div className="font-medium">Updated</div>
          <div className="text-gray-700">{fmtTime(note.updated_time)}</div>
        </div>

        <div>
          <div className="font-medium">Todo?</div>
          <div className="text-gray-700">{note.is_todo ? 'Yes' : 'No'}</div>
        </div>
        <div>
          <div className="font-medium">Todo due</div>
          <div className="text-gray-700">{note.todo_due ? fmtTime(note.todo_due) : '-'}</div>
        </div>
      </div>

      {note.source_url && (
        <div className="mt-4 text-sm">
          <div className="font-medium">Source URL</div>
          <a
            className="text-blue-600 underline"
            href={note.source_url}
            target="_blank"
            rel="noreferrer"
          >
            {note.source_url}
          </a>
        </div>
      )}

      <div className="mt-4">
        <div className="font-medium mb-2">Body</div>
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-3 rounded">
          {note.body || '-'}
        </pre>
      </div>
    </div>
  );
}
