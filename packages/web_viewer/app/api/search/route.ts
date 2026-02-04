import { NextResponse } from 'next/server';
import { Note, SearchResult, NoteEntity } from '@/lib/note';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    if (!query) {
      return NextResponse.json({ success: false, error: 'query query parameter is required' }, { status: 400 });
    }

    const wildcartQuery = `${query}*`;
    const results = Note.selectAll(wildcartQuery);

    const limit = 100;
    const notes = Note.byIds(
      results.map((result: SearchResult) => result.id).slice(0, limit),
      ['id', 'body', 'markup_language', 'is_todo', 'todo_completed']
    );

    const notesById: Record<string, NoteEntity> = {};
    notes.forEach(note => {
      notesById[note.id] = note;
    });

    return NextResponse.json({ success: true, data: {
      results: results,
      noteMap: notesById,
    } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
