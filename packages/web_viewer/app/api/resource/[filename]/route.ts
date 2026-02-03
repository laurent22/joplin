import { NextResponse } from 'next/server';
import { ViewerUtil } from '@/lib/viewerUtil';
import fs from 'fs/promises';
import path from 'path';

type Props = {
  params: Promise<{
    filename: string;
  }>;
};

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(_req: Request, { params }: Props) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400 });
    }

    // prevent path traversal
    const safeName = path.basename(filename);
    const resourceDir = ViewerUtil.getResourceFolderPath();
    const filePath = path.join(resourceDir, safeName);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const data = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
