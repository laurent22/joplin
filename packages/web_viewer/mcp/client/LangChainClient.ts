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
}

// LangChainClient.sendMcpQuestion().catch(console.error);
