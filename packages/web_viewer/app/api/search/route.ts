import { NextResponse } from 'next/server';
import { Note } from '@/lib/note';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    if (!query) {
      return NextResponse.json({ success: false, error: 'query query parameter is required' }, { status: 400 });
    }

    const wildcartQuery = `${query}*`;
    const result = Note.selectAll(wildcartQuery);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
