import { NextResponse } from 'next/server';
import { SuccessResponse, ErrorResponse, ViewerUtil } from '@/lib/viewerUtil';

type ApiResponse = SuccessResponse | ErrorResponse;

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const folderTree = ViewerUtil.selectFolderDataAndCreateTree();

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


