# MCP server

How the [Model Context Protocol](https://modelcontextprotocol.io/) server is wired into Joplin. See [ai_primitives.md](ai_primitives.md) for how it fits with the other AI primitives.

## Overview

The MCP server is a JSON-RPC endpoint on the existing Web Clipper service. It exposes a small set of purpose-built tools for reading and editing notes. External AI applications (Claude Desktop, Cursor, Zed, …) connect to it as one MCP server among others and call those tools from their host-side chat flow. Joplin itself never sees the conversation — only the individual tool calls.

```
External AI app                Joplin (running)
┌───────────────┐              ┌─────────────────────────────┐
│ Claude/Cursor │ ───POST───►  │ Web Clipper :41184          │
│ (host LLM)    │  JSON-RPC    │   └─ /mcp route             │
└───────────────┘              │        └─ McpServer         │
                               │             └─ tool registry │
                               │                  └─ tools/*  │
                               └─────────────────────────────┘
```

## Transport

Single HTTP endpoint at `POST /mcp` on the existing Web Clipper port. Auth uses the same Web Clipper token (`api.token`). Stdio is not implemented in v1.

The endpoint accepts a JSON-RPC 2.0 envelope (or a batch array). Requests without an `id` field are notifications and get no response body. Server-initiated messages aren't supported.

## Protocol surface

| Method | Behaviour |
|---|---|
| `initialize` | Returns protocol version, server info, and the `tools` capability. |
| `tools/list` | Lists enabled tools — disabled ones are hidden entirely. |
| `tools/call` | Invokes a tool by name. |
| `ping` | Returns `{}`. |
| `notifications/initialized` | Accepted, no response. |

Unknown methods return JSON-RPC `MethodNotFound`. Malformed `tools/call` params return `InvalidParams` (−32602).

## Tools

Tools live under `packages/lib/services/mcp/tools/`. Each module exports an `McpTool`:

```ts
interface McpTool {
    id: string;
    description: string;
    inputSchema: JsonSchema;
    handler: (input) => Promise<unknown>;
}
```

Handlers return their raw payload. The dispatcher JSON-serialises it into MCP text content. There is no need to wrap responses in `{ content, isError }` boilerplate.

| Tool | Purpose | Default |
|---|---|---|
| `search_notes` | Keyword search (Joplin FTS syntax). Returns id, title, notebook id, updated time, and a snippet anchored on the match. | on |
| `semantic_search_notes` | Vector search via the embeddings index. Returns ranked chunks with source note id and score. | on |
| `read_note` | One note with notebook title, tag names, timestamps. Body supports `offset` / `max_chars` paging. | on |
| `list_notebooks` | Flat list of notebooks with `parent_id` and `note_count`. | on |
| `list_tags` | Tags that have at least one attached note. | on |
| `create_note` | Creates a note in the chosen notebook (default folder if omitted). | off |
| `update_note` | Patch title / body / notebook / todo state. Body changes can use `append`, `prepend`, or `replace_text` for small edits. | off |
| `delete_note` | Move to trash. Reversible by the user. | off |
| `manage_tags` | Add/remove tags by title. Missing tags in `add` are created. | off |
| `create_notebook` | Optionally nested under a parent. | off |

Write tools default off so users grant write access deliberately.

### Why purpose-built and not a Data API wrapper

The Data API is a generic data front-end with pagination, fields parameters, and a full entity surface. An LLM doesn't need any of that — it needs a small, opinionated capability surface. Wrapping the Data API would force tool descriptions to explain Joplin internals (pagination cursors, available fields) rather than the operation itself.

The tools should not grow into a generic data layer. If a feature can't be expressed as a small, well-named operation, the right answer is usually a new tool, not flags on an existing one.

## Error model

Two error channels, deliberately distinct:

- **`ToolError`** thrown from a handler → `result.isError = true` with the error message as text. The LLM sees it and can recover ("note not found", "ambiguous match", missing parameter, etc.).
- **Any other `Error`** thrown from a handler → JSON-RPC `InternalError` (−32603). The MCP client treats this as a connection-level failure; the stack goes to the server log. The LLM does not see it as tool output.

The split lets us distinguish expected, LLM-recoverable failures from genuine bugs without designing a custom error-code system.

## Tool registry and toggles

`registry.ts` holds the static list of all tools. `findTool(id)` returns a tool only if it exists *and* its `mcp.tool.<id>.enabled` setting is true. `enabledTools()` filters the same way.

Adding a tool means: write the file in `tools/`, register it in `registry.ts`, add the `mcp.tool.<id>.enabled` setting to `builtInMetadata.ts`, and add it to the table above.

## Settings

All MCP settings live in the dedicated `mcp` section of Settings.

| Setting | Default | Purpose |
|---|---|---|
| `mcp.enabled` | false | Master toggle. Server returns 403 when off. |
| `mcp.tool.<id>.enabled` | varies (see table above) | Per-tool toggle. Disabled tools are hidden from `tools/list`. |

There is no scope/permission system on the auth token — for v1, the per-tool toggles are the granularity. Token scopes could be added later without breaking existing setups.

## Why this lives inside the Web Clipper service

The Web Clipper already provides an authenticated localhost HTTP service that's enabled by users who want external integrations. Reusing it means no second port to open, no second token to manage, and no duplicate transport/CORS plumbing. The MCP server is unreachable when the Web Clipper is off, which is the right default.

## What's out of scope for v1

- **Stdio transport.** Host apps that don't support HTTP MCP servers need a bridge like `mcp-remote`.
- **Token scopes.** Per-tool toggles are enough until a real need surfaces.
- **Resource and prompt MCP primitives.** Only tools are exposed.
- **Streaming responses.** Every call is request/response.
- **Joplin running its own chat.** Chat is handled by the host AI app; Joplin is a tool surface, not an LLM consumer in this flow.
