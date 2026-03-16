import { NextRequest, NextResponse } from 'next/server';
import { ragSendMessage, AIHistory } from '@joplin/ai';
import * as path from 'path';
import { ViewerUtil } from '@/lib/viewerUtil';

const gCustomPrompt = `あなたは親切で正確なアシスタントです。
提供されたコンテキスト情報を基に、ユーザーの質問に日本語で回答してください。
コンテキストに答えがない場合は、「提供された情報では回答できません」と答えてください。
回答時のフォーマットはmarkdownでお願いします。
回答時には回答の根拠となったsourceとそのnoteIdをリンクとして表示してください。
その際、noteIdはaタグとしてリンクしてください。
加えて、そのノート内の検索でマッチしたワードをできるだけ長く抽出し、それをsearchパラメタとして追加してください。
例えば、根拠: [{note名}](/note?note_id={noteId}&search={search})のように表示してください.
もしくはfragment_idが存在していたらそのfragment_idをセットしてください。
例えば、根拠: [{note名}](/note?note_id={noteId}#{fragment_id})のように表示してください。
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, histories = [], dbPath } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // デフォルトのdbPathを設定（必要に応じて変更）
    const vectorDbPath = ViewerUtil.getVectorDbFilePath();

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
                  controller.enqueue(encoder.encode(diff));
                }
                lastMessage = msg;
              }
              return replyId;
            },
            gCustomPrompt
          );

          // ストリーム終了
          controller.close();
        } catch (error) {
          console.error('AI Agent error:', error);
          const errorMessage = `\n\nエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`;
          controller.enqueue(encoder.encode(errorMessage));
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
