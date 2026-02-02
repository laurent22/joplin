import { NextResponse } from 'next/server';
import Folder from '@joplin/lib/models/Folder';
import { getDatabase } from '@/lib/database';
import { FolderEntity } from '@joplin/lib/services/database/types';
import { SuccessResponse, ErrorResponse, FolderListResponse, ViewerUtil } from '@/lib/viewerUtil';



type ApiResponse = SuccessResponse | ErrorResponse;

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    // データベース初期化の完了を待つ（初回は自動初期化、2回目以降は即座に返る）
    await getDatabase();
    
    const folderTree = await ViewerUtil.selectFolderDataAndCreateTree();

    return NextResponse.json({ 
      success: true,
      data: folderTree,
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


