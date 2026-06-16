# MCP server

How the [Model Context Protocol](https://modelcontextprotocol.io/) server is wired into Joplin. See [ai_primitives.md](ai_primitives.md) for the user-facing spec.

## Overview

The MCP server is a JSON-RPC endpoint on the existing Web Clipper service. It exposes a small set of purpose-built tools for note search, read, write, and listing. External AI applications (Claude Desktop, Cursor, Zed, etc.) connect to it as one MCP server among others and call those tools as part of their host-side chat flow. Joplin itself never sees the conversation — only the individual tool calls.

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

Single HTTP endpoint mounted at `POST /mcp` on the existing Web Clipper port. Auth uses the same Web Clipper token (`api.token`). Stdio transport is not implemented in v1.

The endpoint accepts a JSON-RPC 2.0 envelope (or a batch array). Requests with no `id` are treated as notifications and produce no response body. Server-initiated messages are not supported.

## Protocol surface

| Method | Behaviour |
|--------|-----------|
| `initialize` | Returns protocol version, server info, and the `tools` capability. |
| `tools/list` | Lists enabled tools — disabled ones are hidden from clients entirely. |
| `tools/call` | Invokes a tool by name. |
| `ping` | Returns `{}`. |
| `notifications/initialized` | Accepted, no response. |

Unknown methods return JSON-RPC `MethodNotFound`. Tool-level failures (unknown tool, disabled tool, bad input) come back as `result.isError = true` with a text message so the host LLM sees a normal tool-error response and can recover.

## Tools

All six tools live under `packages/lib/services/mcp/tools/`. Each module exports a single `McpTool` with `{ id, description, inputSchema, handler }`. The handler returns `{ content, isError? }` where `content` is an array of `{ type: 'text', text }`. JSON payloads are serialised into a text block — MCP clients parse it back, and we keep the option to add `resource` or `image` content types later without changing the registry.

| Tool | Purpose |
|------|---------|
| `search_notes` | FTS search via `SearchEngineUtils`. Returns id, title, notebook id, updated time. |
| `read_note` | Loads one note plus its notebook title and tag names. Refuses trashed and conflict notes. |
| `list_notebooks` | Flat list of folders with `parent_id` for tree reconstruction. |
| `list_tags` | Tags that have at least one attached note. |
| `create_note` | Creates a note in the chosen notebook (default folder if omitted). |
| `update_note` | Patches title / body / notebook / todo state. Omitted fields keep their value. |

Why purpose-built rather than wrapping the Data API: the Data API is a generic data front-end with pagination, fields parameters, and a full entity surface. An LLM doesn't need any of that — it needs a small, opinionated capability surface. Wrapping the Data API would force tool descriptions to explain Joplin internals (pagination cursors, available fields) rather than the operation itself.

The tools should not grow into a generic data layer over time. If a feature can't be expressed as a small, well-named operation, the right answer is usually a new tool, not flags on an existing one.

## Tool registry and toggles

`registry.ts` holds the static list of all tools. `findTool(id)` returns a tool only if it exists *and* its `mcp.tool.<id>.enabled` setting is true. `enabledTools()` filters the same way. Read tools default to enabled; write tools (`create_note`, `update_note`) default to disabled — users have to explicitly grant write access.

Adding a tool means: register it in `registry.ts`, add the `mcp.tool.<id>.enabled` setting to `builtInMetadata.ts`, and add it to the table above.

## Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `mcp.enabled` | false | Master toggle. Server returns 403 when off. |
| `mcp.tool.search_notes.enabled` | true | |
| `mcp.tool.read_note.enabled` | true | |
| `mcp.tool.list_notebooks.enabled` | true | |
| `mcp.tool.list_tags.enabled` | true | |
| `mcp.tool.create_note.enabled` | false | Write — opt-in. |
| `mcp.tool.update_note.enabled` | false | Write — opt-in. |

All MCP settings live in the `server` section alongside the Web Clipper. There is no separate scope/permission system on the auth token — for v1, the per-tool toggles are the granularity. Token scopes can be added later without breaking existing setups.

## Why this lives inside the Web Clipper service

The Web Clipper already provides an authenticated localhost HTTP service that's enabled by users who want external integrations. Reusing it means no second port to open, no second token to manage, and no duplicate transport/CORS plumbing. The MCP server is dead when Web Clipper is off, which is the right default.

## What's out of scope for v1

- Stdio transport (host apps that don't support HTTP MCP servers will need to wait or run a bridge).
- Token scopes (per-tool toggles are enough until a real need surfaces).
- Resource and prompt MCP primitives (only tools are exposed).
- Streaming responses — every call is request/response.
- Joplin running its own chat: chat is handled by the host AI app; Joplin is a tool surface, not an LLM consumer in this flow.
