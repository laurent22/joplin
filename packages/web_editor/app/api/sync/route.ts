import { NextResponse } from 'next/server';
import { ViewerUtil } from '@/lib/viewerUtil';
import { runSync } from '@/scripts/sync_lib';

export async function POST() {
  const profileDir = ViewerUtil.getProfileFolderPath();
  try {
    const stats = await runSync(profileDir);
    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[sync API] Sync failed:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
