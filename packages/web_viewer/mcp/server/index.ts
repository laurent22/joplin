import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';
import { ViewerUtil } from '../../lib/viewerUtil';

// Parse command line arguments
const args = process.argv.slice(2);
const profileNameIndex = args.indexOf('--profileName');
if (profileNameIndex !== -1 && profileNameIndex + 1 < args.length) {
  process.env.PROFILE_NAME = args[profileNameIndex + 1];
  console.log(`Profile name set to: ${process.env.PROFILE_NAME}`);
}

function createServer() {
  const server = new McpServer({
    name: 'Demo',
    version: '1.0.0',
  });

  server.registerTool(
    'add_test',
    {
      description: '与えられた数値の足し算をする（さらに10を足す）',
      inputSchema: z.object({
        a: z.number().describe('最初の数値'),
        b: z.number().describe('2番目の数値'),
      }),
    },
    async ({ a, b }) => ({
      content: [{ type: 'text', text: String(a + b + 10) }],
    })
  );

  server.registerTool(
    'get_note_tree',
    {
      description: 'Get folders and notes as a tree structure',
      inputSchema: z.object({}),
    },
    async () => {
      const tree = ViewerUtil.selectFolderAndNotesAndCreateTree();
      return {
        content: [{ type: 'text', text: JSON.stringify(tree) }],
      };
    }
  );

  return server;
}

const port = Number(process.env.MCP_PORT ?? 8080);
const app = createMcpExpressApp();

app.post('/mcp', async (req, res) => {
  try {
    // リクエストのログ出力
    console.log('[MCP Request]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      body: JSON.stringify(req.body, null, 2),
    });

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    await server.connect(transport);

    // レスポンスのログ出力
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks: Buffer[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.write = function (chunk: any, ...args: any[]): boolean {
      chunks.push(Buffer.from(chunk));
      return originalWrite(chunk, ...args);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function (chunk?: any, ...args: any[]): any {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString('utf8');
      console.log('[MCP Response]', {
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        body: body,
      });
      return originalEnd(chunk, ...args);
    };

    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('[MCP Error]', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    })
  );
});

app.delete('/mcp', (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    })
  );
});

app.listen(port, () => {
  console.log(`MCP HTTP server listening on port ${port}`);
  console.log(`Endpoint: http://localhost:${port}/mcp`);
});
