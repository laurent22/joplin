import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // ストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // メッセージを1文字ずつ送信
        for (let i = 0; i < message.length; i++) {
          const char = message[i];
          controller.enqueue(encoder.encode(char));

          // 1秒待機
          if (i < message.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
