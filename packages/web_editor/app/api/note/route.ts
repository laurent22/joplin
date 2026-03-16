import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/lib/note';
import { ViewerUtil } from '@/lib/viewerUtil';
import * as cheerio from 'cheerio';

export async function PUT(req: NextRequest) {
  try {
    const { id, body, updatedTime } = await req.json();
    if (!id || body === undefined) {
      return NextResponse.json(
        { success: false, error: 'id and body are required' },
        { status: 400 }
      );
    }
    const existing = Note.getNoteById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    if (updatedTime !== undefined && existing.updated_time !== updatedTime) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          error: 'ノートが他の場所で更新されています。リロードしてから再編集してください。',
        },
        { status: 409 }
      );
    }
    const resourceDir = ViewerUtil.getResourceFolderPath();
    const joplinSchemeBody = ViewerUtil.revertResourceDirToJoplinScheme(body, resourceDir).html();
    Note.save({ ...existing, body: joplinSchemeBody });
    const saved = Note.getNoteById(id);
    return NextResponse.json({ success: true, updatedTime: saved?.updated_time });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const note = Note.getNoteById(id);
    const resourceDir = `/api/resource/`;
    const $ = cheerio.load(note?.body || '');
    const resourceModifiedHtml = ViewerUtil.modifyJoplinResource($, resourceDir);
    const linkModifiedHtml = ViewerUtil.modifyJoplinLinkAnchor(resourceModifiedHtml);
    const katexModifiedHtml = ViewerUtil.addKatexCssIfNotExists(linkModifiedHtml);
    const finalModifiedHtml = ViewerUtil.removeDataMceSrcAttr(katexModifiedHtml);
    if (note) {
      note.body = finalModifiedHtml.html();
    }
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: note });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
