'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { NoteEntity } from '@/lib/database';
import { useGetNote } from '@/lib/hooks';
import NoteDetails from './NoteDetails';

export default function NoteViewer() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('note_id') ?? null;

  const { data: fetched, isLoading, error } = useGetNote(noteId);
  console.log(`note: id=${noteId}, note_title=${fetched?.title}`);
  // console.log(`note body = ${fetched?.body}`);

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

  const note = fetched ?? null;

  //   return <NoteAbst note={note as (NoteEntity & { body?: string }) | null} />;
  return <NoteDetails note={note as (NoteEntity & { body?: string }) | null} />;
}
