import { NextResponse } from 'next/server';
import Folder from '@joplin/lib/models/Folder';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    // データベース初期化の完了を待つ（初回は自動初期化、2回目以降は即座に返る）
    await getDatabase();
    
    // Folder.all()を使って全てのフォルダ情報を取得
    const folders = await Folder.all({
      fields: ['id', 'title', 'parent_id', 'updated_time', 'created_time'],
      order: [
        {
          by: 'title',
          dir: 'ASC',
        },
      ],
    });

    return NextResponse.json({ 
      success: true,
      data: folders,
      count: folders.length 
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch folders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
