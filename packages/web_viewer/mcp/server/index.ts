import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';
import { ViewerUtil } from '../../lib/viewerUtil';
import { Note } from '@/lib/note';
import TurndownService from 'turndown';

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

  // server.registerTool(
  //   'add_test',
  //   {
  //     description: '与えられた数値の足し算をする（さらに10を足す）',
  //     inputSchema: z.object({
  //       a: z.number().describe('最初の数値'),
  //       b: z.number().describe('2番目の数値'),
  //     }),
  //   },
  //   async ({ a, b }) => ({
  //     content: [{ type: 'text', text: String(a + b + 10) }],
  //   })
  // );

  server.registerTool(
    'get_note_tree',
    {
      description: 'Get folders and notes as a tree structure',
      inputSchema: z.object({}),
    },
    async () => {
      const tree = ViewerUtil.selectFolderAndNotesAndCreateTree();
      const simpleTree = ViewerUtil.simpleTreeNodes(tree);
      return {
        content: [{ type: 'text', text: JSON.stringify(simpleTree) }],
      };
    }
  );

  server.registerTool(
    'get_note_content',
    {
      description: 'Get the content of a specific note',
      inputSchema: z.object({
        noteId: z.string().describe('The ID of the note'),
        offset: z.number().describe('The offset to start reading the note content from').optional(),
        length: z.number().describe('The length of the content to read').optional(),
      }),
    },
    async ({ noteId, offset, length }) => {
      // Implement the logic to get the note content based on noteId, offset, and length
      const content = Note.getNoteById(noteId);
      if (!content) {
        return {
          content: [{ type: 'text', text: '' }],
        };
      }

      let bodyText = content.body ?? '';

      // If the note contains HTML content (markup_language === 1), convert to Markdown
      if (bodyText) {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
        });
        bodyText = turndownService.turndown(bodyText);
      }

      if (offset !== undefined && length !== undefined) {
        const text = bodyText.slice(offset, offset + length);
        return {
          content: [{ type: 'text', text }],
        };
      }
      return {
        content: [{ type: 'text', text: bodyText }],
      };
    }
  );

  server.registerTool(
    'search_markdown_notes',
    {
      description: 'Full-text search over markdown_notes. Returns snippets around matched keywords instead of full note bodies.',
      inputSchema: z.object({
        query: z.string().describe('Search keyword(s) for full-text search (SQLite FTS4 MATCH syntax)'),
        maxResults: z.number().describe('Maximum number of results to return').optional(),
        contextChars: z.number().describe('Number of characters to include before and after each match (default: 1000)').optional(),
      }),
    },
    async ({ query, maxResults, contextChars }) => {
      const snippetRadius = contextChars ?? 1000;
      try {
        const searchResults = Note.selectAllMarkdownFts(query);
        const limited = maxResults ? searchResults.slice(0, maxResults) : searchResults;
        const ids = limited.map((r) => r.id);
        const notes = Note.markdownByIds(ids);
        const noteMap: Record<string, typeof notes[0]> = {};
        for (const n of notes) {
          noteMap[n.id] = n;
        }

        // Build a case-insensitive regex from the query keywords
        const keywords = query.replace(/[*"]/g, '').split(/\s+/).filter(Boolean);
        const pattern = keywords.length
          ? new RegExp(keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
          : null;

        const results = limited.flatMap((r) => {
          const note = noteMap[r.id];
          const body = note?.body ?? '';

          let snippets: { note_id: string; note_title: string; text: string }[] = [];
          if (pattern && body) {
            // Collect all match positions
            const matches: { start: number; end: number }[] = [];
            let m: RegExpExecArray | null;
            while ((m = pattern.exec(body)) !== null) {
              matches.push({ start: m.index, end: m.index + m[0].length });
            }

            if (matches.length > 0) {
              // Merge overlapping snippet ranges
              const ranges: { start: number; end: number }[] = [];
              for (const match of matches) {
                const rangeStart = Math.max(0, match.start - snippetRadius);
                const rangeEnd = Math.min(body.length, match.end + snippetRadius);
                const last = ranges[ranges.length - 1];
                if (last && rangeStart <= last.end) {
                  last.end = Math.max(last.end, rangeEnd);
                } else {
                  ranges.push({ start: rangeStart, end: rangeEnd });
                }
              }
              snippets = ranges.map((range) => {
                const prefix = range.start > 0 ? '...' : '';
                const suffix = range.end < body.length ? '...' : '';
                return {
                  note_id: r.id,
                  note_title: r.title,
                  text: `${prefix}${body.slice(range.start, range.end)}${suffix}`,
                };
              });
            } else {
              // No regex match found — return head of body as fallback
              snippets = [{ note_id: r.id, note_title: r.title, text: body.slice(0, snippetRadius * 2) }];
            }
          } else if (body) {
            snippets = [{ note_id: r.id, note_title: r.title, text: body.slice(0, snippetRadius * 2) }];
          }

          return snippets;
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(results) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Search error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
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
