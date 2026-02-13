import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ProxyAgent } from 'undici';

export class LangChainClient {
  public static async sendMcpQuestion() {
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

    const proxyAgent = new ProxyAgent('http://127.0.0.1:8081');
    const model = new ChatOpenAI({
      model: 'gpt-5-mini', // adjust if needed
      apiKey: process.env.JOPLIN_OAI_KEY,
      configuration: {
        fetchOptions: {
          dispatcher: proxyAgent,
        },
      },
    });

    const agent = createAgent({
      model,
      tools,
    });

    const result = await agent.invoke({
      messages: [{ role: 'user', content: `MCPを利用して100と30渡して計算結果を表示してください` }],
    });

    // Print only the final AI reply content
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
    } else if (typeof result === 'string') {
      console.log(result);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  }
}

LangChainClient.sendMcpQuestion().catch(console.error);
