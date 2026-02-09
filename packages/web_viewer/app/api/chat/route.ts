import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // 意図的に3秒の遅延を入れる
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // エコーレスポンス
    return NextResponse.json({
      response: message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
