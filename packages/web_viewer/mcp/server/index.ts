import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';
import { ViewerUtil } from '../../lib/viewerUtil';
import { Note } from '@/lib/note';
import TurndownService from 'turndown';

// UTF-8 バイトオフセット → JS 文字列インデックス のマッピングを構築
function buildByteToCharMap(text: string): number[] {
  const encoder = new TextEncoder();
  const map: number[] = [];
  let bytePos = 0;
  let charPos = 0;
  while (charPos < text.length) {
    const codePoint = text.codePointAt(charPos)!;
    const charByteLen = encoder.encode(String.fromCodePoint(codePoint)).length;
    for (let b = 0; b < charByteLen; b++) {
      map[bytePos + b] = charPos;
    }
    bytePos += charByteLen;
    charPos += codePoint > 0xffff ? 2 : 1;
  }
  map[bytePos] = text.length;
  return map;
}

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
        contextChars: z.number().describe('Number of characters to include before and after each match (default: 100)').optional(),
      }),
    },
    async ({ query, maxResults, contextChars }) => {
      const CONTEXT = contextChars ?? 100;
      const BODY_COL = 2; // markdown_notes_fts 列順: 0=id(notindexed), 1=title, 2=body
      try {
        const searchResults = Note.selectAllMarkdownFts(query);
        const limited = maxResults ? searchResults.slice(0, maxResults) : searchResults;
        const ids = limited.map((r) => r.id);
        const notes = Note.markdownByIds(ids);
        const noteMap: Record<string, typeof notes[0]> = {};
        for (const n of notes) {
          noteMap[n.id] = n;
        }

        const results = limited.flatMap((r) => {
          const note = noteMap[r.id];
          const body = note?.body ?? '';
          if (!body) return [];

          // offsets フィールドが無い場合はボディ先頭を返すフォールバック
          if (!r.offsets) {
            return [{ note_id: r.id, note_title: r.title, text: body.slice(0, CONTEXT * 2) }];
          }

          // FTS4 offsets をパース: 4 整数ずつ [col, term, byteOffset, byteLen]
          const nums = r.offsets.split(' ').map(Number);
          const bodyOffsets: { byteOffset: number; byteLen: number }[] = [];
          for (let i = 0; i + 3 < nums.length; i += 4) {
            if (nums[i] === BODY_COL) {
              bodyOffsets.push({ byteOffset: nums[i + 2], byteLen: nums[i + 3] });
            }
          }

          if (bodyOffsets.length === 0) {
            return [{ note_id: r.id, note_title: r.title, text: body.slice(0, CONTEXT * 2) }];
          }

          const byteToChar = buildByteToCharMap(body);
          const snippets: { note_id: string; note_title: string; text: string }[] = [];
          const seen = new Set<string>();

          for (const { byteOffset, byteLen } of bodyOffsets) {
            const charStart = byteToChar[byteOffset] ?? 0;
            const charEnd = byteToChar[byteOffset + byteLen] ?? charStart + 1;
            const fragStart = Math.max(0, charStart - CONTEXT);
            const fragEnd = Math.min(body.length, charEnd + CONTEXT);
            const prefix = fragStart > 0 ? '...' : '';
            const suffix = fragEnd < body.length ? '...' : '';
            const text = `${prefix}${body.slice(fragStart, fragEnd)}${suffix}`;
            if (!seen.has(text)) {
              seen.add(text);
              snippets.push({ note_id: r.id, note_title: r.title, text });
            }
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
