'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useGetNote } from '@/lib/hooks';

const TinyMCEBody = dynamic(() => import('./TinyMCEBody'), { ssr: false });

export default function NoteEditor() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('note_id') ?? null;

  const { data: fetched, isLoading, error } = useGetNote(noteId);

  console.log(`note: id=${noteId}, note_title=${fetched?.title}`);

  if (!noteId) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">No note selected</h2>
        <p className="text-sm text-gray-500">ダブルクリックでノートを選択してください。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">Error: {(error as Error).message}</div>
      </div>
    );
  }

  const note = fetched ?? null;

  // TinyMCEBody は常にマウントしておく（isLoading 中にアンマウントすると
  // isDirty などの状態がリセットされ、確認ダイアログが表示されなくなるため）
  return (
    <div
      className="w-full h-full"
      style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#fff',
          borderBottom: '1px solid #e0e0e0',
          padding: '8px 16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {note?.title ?? ''}
        </h2>
      </div>
      {isLoading && (
        <div
          className="p-4"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div className="text-sm text-gray-500">Loading note…</div>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TinyMCEBody
          html={note?.body ?? ''}
          noteId={noteId}
          readOnly={false}
          updatedTime={note?.updated_time}
        />
      </div>
    </div>
  );
}
