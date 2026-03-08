import { NextResponse } from 'next/server';
import { Note, MarkdownSearchResult, MarkdownNoteEntity } from '@/lib/note';
import { Config } from '../../../config';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query query parameter is required' },
        { status: 400 }
      );
    }

    const wildcartQuery = `${query}*`;
    const results = Note.selectAllMarkdownFts(wildcartQuery);

    const limit = Config.searchNoteLimit;
    const notes = Note.markdownByIds(
      results.map((result: MarkdownSearchResult) => result.id).slice(0, limit),
      ['id', 'parent_id', 'title', 'body']
    );

    const notesById: Record<string, MarkdownNoteEntity> = {};
    notes.forEach((note) => {
      notesById[note.id] = note;
    });

    return NextResponse.json({
      success: true,
      data: {
        results: results,
        noteMap: notesById,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
