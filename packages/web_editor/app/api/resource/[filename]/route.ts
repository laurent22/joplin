import { NextResponse } from 'next/server';
import { ViewerUtil } from '@/lib/viewerUtil';
import { Resource } from '@/lib/resource';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Props) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400 });
    }

    // prevent path traversal
    const safeName = path.basename(filename);
    const ext = path.extname(safeName).toLowerCase();
    const resourceId = uuidv4().replace(/-/g, '');
    const newFilename = ext ? `${resourceId}${ext}` : resourceId;

    const resourceDir = ViewerUtil.getResourceFolderPath();
    await fs.mkdir(resourceDir, { recursive: true });
    const filePath = path.join(resourceDir, newFilename);

    const buffer = await req.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));

    // ファイル書き込み後にメタデータを DB に保存（shim-init-node.js の Resource.save に相当）
    const stat = await fs.stat(filePath);
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    const fileExtension = ext.startsWith('.') ? ext.slice(1) : ext;

    Resource.save({
      id: resourceId,
      title: safeName,
      mime,
      filename: '',
      file_extension: fileExtension,
      size: stat.size,
      created_time: Date.now(),
      updated_time: Date.now(),
    });

    return NextResponse.json({ success: true, filename: newFilename, originalName: safeName });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
