import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';

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

  return server;
}

const port = Number(process.env.MCP_PORT ?? 8080);
const app = createMcpExpressApp();

app.post('/mcp', async (req, res) => {
  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
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
