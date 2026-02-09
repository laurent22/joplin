import { NextRequest, NextResponse } from 'next/server';
import { ragSendMessage, AIHistory } from '@joplin/ai';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, histories = [], dbPath } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // デフォルトのdbPathを設定（必要に応じて変更）
    const vectorDbPath = dbPath || path.join(process.cwd(), '..', 'AI', 'faiss_index');
    
    // ストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const replyId = Date.now().toString();
          let lastMessage = '';

          // AIエージェントのレスポンスをストリーミング
          await ragSendMessage(
            message,
            vectorDbPath,
            replyId,
            histories as AIHistory[],
            (msg: string, _id?: string, loading?: boolean) => {
              // 差分のみを送信
              if (msg !== lastMessage) {
                const diff = msg.slice(lastMessage.length);
                if (diff) {
                  const data = JSON.stringify({
                    content: diff,
                    loading: loading || false,
                    fullText: msg,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                lastMessage = msg;
              }
              return replyId;
            }
          );

          // ストリーム終了
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('AI Agent error:', error);
          const errorData = JSON.stringify({
            error: 'AIエージェントでエラーが発生しました',
            details: error instanceof Error ? error.message : String(error),
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'エラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
