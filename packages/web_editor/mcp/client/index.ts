import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * MCPクライアント実装
 * サーバーのadd_testツールを呼び出すサンプル
 */
async function runMCPClient() {
  // サーバーのURL
  const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';

  console.log(`Connecting to MCP server at ${serverUrl}...`);

  // トランスポートの作成
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));

  // クライアントの作成
  const client = new Client(
    {
      name: 'demo-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // サーバーに接続
    await client.connect(transport);
    console.log('Connected to MCP server');

    // 利用可能なツールのリストを取得
    const toolsResponse = await client.listTools();
    console.log('\nAvailable tools:');
    console.log(JSON.stringify(toolsResponse.tools, null, 2));

    // add_testツールを呼び出し
    console.log('\nCalling add_test tool with a=5, b=3...');
    const result = await client.callTool({
      name: 'add_test',
      arguments: {
        a: 5,
        b: 3,
      },
    });

    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));

    // 別のパラメータでもう一度呼び出し
    console.log('\nCalling add_test tool with a=10, b=20...');
    const result2 = await client.callTool({
      name: 'add_test',
      arguments: {
        a: 10,
        b: 20,
      },
    });

    console.log('Result:');
    console.log(JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // クライアントをクローズ
    await client.close();
    console.log('\nConnection closed');
  }
}

// スクリプトとして実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  runMCPClient().catch(console.error);
}

export { runMCPClient };
