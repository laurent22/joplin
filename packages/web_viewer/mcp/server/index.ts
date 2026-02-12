import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import express from 'express';
import { z } from 'zod';

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

const port = Number(process.env.MCP_PORT ?? 4000);
const app = createMcpExpressApp();
const transport = new StreamableHTTPServerTransport();

app.use(express.json());
app.post('/mcp', (req, res) => {
  transport.handleRequest(req, res, req.body);
});
app.get('/mcp', (req, res) => {
  transport.handleRequest(req, res);
});

await server.connect(transport);

app.listen(port, () => {
  console.log(`MCP HTTP server listening on port ${port}`);
  console.log(`Endpoint: http://localhost:${port}/mcp`);
});
