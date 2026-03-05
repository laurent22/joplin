import { NextRequest, NextResponse } from 'next/server';
import { LangChainClient } from '@/mcp/client/LangChainClient';

const gSystemPrompt = `あなたは親切で正確なアシスタントです。
提供されたコンテキスト情報を基に、ユーザーの質問に日本語で回答してください。
コンテキストに答えがない場合は、「提供された情報では回答できません」と答えてください。
回答時のフォーマットはmarkdownでお願いします。
その際、noteIdを指定したリンクの例は以下です。
   [note名](/note?note_id={noteId})
加えて、そのノート内の検索でマッチしたワードをできるだけ長く抽出し、それをsearchパラメタとして追加してください。
例えば、根拠: [{note名}](/note?note_id={noteId}&search={search})のように表示してください.
もしくはfragment_idが存在していたらそのfragment_idをセットしてください。
例えば、根拠: [{note名}](/note?note_id={noteId}#{fragment_id})のように表示してください。
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, histories = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const response = await LangChainClient.sendMcpQuestion(message, gSystemPrompt, histories);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error processing agent request:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
