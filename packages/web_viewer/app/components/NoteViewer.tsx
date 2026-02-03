'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/lib/hooks';
import { NoteEntity } from '@/lib/database';
import NoteAbst from './NoteAbst';
import NoteDetails from './NoteDetails';

function fmtTime(ts?: number) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function NoteViewer() {
  const selected = useAppSelector((s) => s.selectedNote.note as NoteEntity | null);
  const noteId = selected?.id ?? null;

  const { data: fetched, isLoading, error } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const res = await fetch(`/api/note?id=${encodeURIComponent(noteId as string)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch note');
      return json.data as (NoteEntity & { body?: string });
    },
    enabled: !!noteId,
    staleTime: 60_000,
  });
  console.log(`note: id=${noteId}, note_title=${fetched?.title}`);
  console.log(`note body = ${fetched?.body}`);

  if (!noteId) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">No note selected</h2>
        <p className="text-sm text-gray-500">ダブルクリックでノートを選択してください。</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading note…</div>
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

  const note = fetched ?? selected;

//   return <NoteAbst note={note as (NoteEntity & { body?: string }) | null} />;
return <NoteDetails note={note as (NoteEntity & { body?: string }) | null} />;
}
