import { NextResponse } from 'next/server';
import { Note } from '@/lib/note';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id query parameter is required' }, { status: 400 });
    }

    const note = Note.getNoteById(id);
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: note });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
