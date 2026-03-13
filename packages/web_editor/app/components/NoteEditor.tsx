'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { NoteEntity } from '@/lib/database';

const TinyMCEBody = dynamic(() => import('./TinyMCEBody'), { ssr: false });

export default function NoteEditor() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('note_id') ?? null;

  const {
    data: fetched,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const res = await fetch(`/api/note?id=${encodeURIComponent(noteId as string)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch note');
      return json.data as NoteEntity & { body?: string };
    },
    enabled: !!noteId,
    staleTime: 0,
  });

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
    <div className="w-full h-full" style={{ position: 'relative' }}>
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
      <TinyMCEBody html={note?.body ?? ''} noteId={noteId} readOnly={false} />
    </div>
  );
}
