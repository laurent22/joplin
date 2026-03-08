import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { Config } from '../../config.ts';

export interface ChatHistory {
  id: string;
  text: string;
  isUser: boolean;
  loading?: boolean;
}

export class LangChainClient {
  public static async sendMcpQuestion(
    message: string,
    systemPrompt?: string,
    histories: ChatHistory[] = []
  ): Promise<string> {
    const mcp = new MultiServerMCPClient({
      myServer: {
        transport: 'http',
        url: 'http://localhost:8080/mcp', // MCPのHTTPエンドポイント
        // headers を付けたい場合は下（※ドキュメントに記載あり）
        // headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` },
      },
    });

    // MCPサーバーが公開している tools を LangChain Tool として取得
    const tools = await mcp.getTools(); // :contentReference[oaicite:1]{index=1}

    // Proxy設定
    const modelConfig: ConstructorParameters<typeof ChatOpenAI>[0] = {
      model: 'gpt-5-mini', // adjust if needed
      apiKey: process.env.JOPLIN_OAI_KEY,
    };

    if (Config.useProxy) {
      const proxyAgent = new ProxyAgent({
        uri: 'http://127.0.0.1:8082',
        requestTls: {
          rejectUnauthorized: false,
        },
      });
      modelConfig.configuration = {
        fetch: ((url: string, init?: object) => {
          return undiciFetch(url, { ...init, dispatcher: proxyAgent });
        }) as unknown as typeof globalThis.fetch,
      };
    }

    const model = new ChatOpenAI(modelConfig);

    const agent = createAgent({
      model,
      tools,
    });

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // 会話履歴を追加
    for (const history of histories) {
      messages.push({
        role: history.isUser ? 'user' : 'assistant',
        content: history.text,
      });
    }

    // 現在のメッセージを追加
    messages.push({ role: 'user', content: message });

    const result = await agent.invoke({
      messages,
    });

    // Extract the final AI reply content
    const msgs = Array.isArray(result?.messages) ? result.messages : [];
    const lastAi = msgs
      .slice()
      .reverse()
      .find((m) => {
        return (
          m &&
          (m.name === 'model' || m.type === 'ai' || String(m.constructor?.name).includes('AI')) &&
          m.content
        );
      });

    if (lastAi && lastAi.content) {
      console.log(lastAi.content);
      return String(lastAi.content);
    } else if (typeof result === 'string') {
      console.log(result);
      return result;
    } else {
      console.log(result);
      return JSON.stringify(result, null, 2);
    }
  }

  /**
   * chat/route.ts と同様のストリーミング版。
   * agent.stream() の streamMode:"messages" で AIMessageChunk を逐次 onToken に渡す。
   */
  public static async sendMcpQuestionStream(
    message: string,
    onToken: (token: string) => void,
    systemPrompt?: string,
    histories: ChatHistory[] = []
  ): Promise<void> {
    const mcp = new MultiServerMCPClient({
      myServer: {
        transport: 'http',
        url: 'http://localhost:8080/mcp',
      },
    });

    const tools = await mcp.getTools();

    const modelConfig: ConstructorParameters<typeof ChatOpenAI>[0] = {
      model: 'gpt-5-mini',
      apiKey: process.env.JOPLIN_OAI_KEY,
      streaming: true,
    };

    if (Config.useProxy) {
      const proxyAgent = new ProxyAgent({
        uri: 'http://127.0.0.1:8082',
        requestTls: { rejectUnauthorized: false },
      });
      modelConfig.configuration = {
        fetch: ((url: string, init?: object) => {
          return undiciFetch(url, { ...init, dispatcher: proxyAgent });
        }) as unknown as typeof globalThis.fetch,
      };
    }

    const model = new ChatOpenAI(modelConfig);
    const agent = createAgent({ model, tools });

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    for (const history of histories) {
      messages.push({
        role: history.isUser ? 'user' : 'assistant',
        content: history.text,
      });
    }
    messages.push({ role: 'user', content: message });

    // streamMode: "messages" → [MessageLike, metadata] のタプルを逐次 yield
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: AsyncIterable<any> = await agent.stream({ messages }, { streamMode: 'messages' });

    for await (const chunk of stream) {
      // タプル形式 [message, metadata] の場合は先頭要素を取得
      const msg = Array.isArray(chunk) ? chunk[0] : chunk;
      if (!msg || !('content' in msg)) continue;

      // AIメッセージのみを対象とする（ToolMessageやHumanMessageは除外）
      // msg.type === 'tool' はツール実行結果（検索結果JSONなど）
      if (msg.type && msg.type !== 'ai') continue;

      // ツール呼び出しリクエスト（中間のAIメッセージ）はスキップ
      if (msg.tool_calls && msg.tool_calls.length > 0) continue;
      if (msg.tool_call_chunks && msg.tool_call_chunks.length > 0) continue;

      const content = msg.content;
      if (typeof content === 'string' && content) {
        onToken(content);
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === 'string') {
            onToken(part);
          } else if (
            part &&
            typeof part === 'object' &&
            'text' in part &&
            typeof part.text === 'string'
          ) {
            onToken(part.text);
          }
        }
      }
    }

    await mcp.close();
  }
}

// LangChainClient.sendMcpQuestion().catch(console.error);
