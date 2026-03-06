import { NextRequest, NextResponse } from 'next/server';
import { LangChainClient } from '@/mcp/client/LangChainClient';

const gSystemPrompt = `あなたはJoplinノートを参照して質問に答える専門のアシスタントです。

## 基本方針
- 必ずツールを使用してノートを検索・取得してから回答してください
- ノートの内容を根拠として、事実に忠実に回答してください
- 検索結果にあった情報だけを回答に使用し、推測・補完はしないでください
- ノートに答えがない場合のみ「提供された情報では回答できません」と回答してください
- 回答はすべて日本語・markdownフォーマットで記述してください

## ツールの使用戦略
1. **search_markdown_notes で検索**: 質問から核心となる名詞・固有名詞を2〜4語選んで検索してください
2. **結果が不十分な場合**: 異なるキーワードや類義語、正式名称、略語、英語や日本語など別の表現で再検索してください（最大10回まで試みる）
3. **詳細確認が必要な場合**: get_note_content で該当ノートの全文を取得してください
4. **フォルダ構造の把握が必要な場合**: get_note_tree を活用してください

## 検索キーワード選定のルール
- 質問の核心となる名詞・専門用語・固有名詞を優先する
- 動詞・形容詞・助詞は除外する
- 複合語は分割して試みる（例: 「タスク管理方法」→「タスク管理」）

## 回答フォーマット
回答本文を記述した後、参照したすべてのノートへのリンクを以下のルールで明示してください。

**リンク形式（優先順位順）:**
1. fragment_id がある場合: \`[ノート名](/note?note_id={noteId}#{fragment_id})\`
2. 検索マッチ箇所がある場合: \`[ノート名](/note?note_id={noteId}&search={search})\`
   - search には回答の根拠となった一節を具体的に（15〜50文字）そのまま指定する
3. 上記がない場合: \`[ノート名](/note?note_id={noteId})\`

複数ノートを参照した場合はすべて列挙してください。

**記載例:**
> 根拠:
> - [タスク管理ガイド](/note?note_id=abc123&search=優先度はP1からP3で分類する)
> - [プロジェクト手順書](/note?note_id=def456#section-setup)
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

    // ストリーミングレスポンス（chat/route.ts と同様の方式）
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await LangChainClient.sendMcpQuestionStream(
            message,
            (token: string) => {
              console.log(`Token: ${token}`);
              controller.enqueue(encoder.encode(token));
            },
            gSystemPrompt,
            histories
          );
          controller.close();
        } catch (error) {
          console.error('Agent stream error:', error);
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
