import { NextResponse } from 'next/server';
import Folder from '@joplin/lib/models/Folder';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    // データベースを初期化
    await initializeDatabase();
    
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
