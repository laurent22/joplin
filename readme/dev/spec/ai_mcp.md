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

Tools live under `packages/lib/services/ai/tools/`. Each module exports a `ToolDefinition`.

Tool handlers return their raw payload. The dispatcher JSON-serialises it into MCP text content. There is no need to wrap responses in `{ content, isError }` boilerplate.

| Tool | Purpose | Default |
|---|---|---|
| `search_notes` | Keyword search (Joplin FTS syntax). Returns id, title, notebook id, updated time, a snippet anchored on the match, and the match's enclosing section. | on |
| `semantic_search_notes` | Vector search via the embeddings index. Returns ranked chunks with source note id and score. | on |
| `related_notes` | Notes similar in meaning to a given note. See [Related notes](#related-notes). Shares the `semantic_search_notes` setting. | off |
| `read_note` | One note with notebook title, tag names, timestamps. See [Reading long notes](#reading-long-notes). | on |
| `read_notes` | Up to 20 notes in one call. See [Reading several notes](#reading-several-notes). Shares the `read_note` setting. | on |
| `list_notebooks` | Flat list of notebooks with `parent_id` and `note_count`. | on |
| `list_tags` | Tags that have at least one attached note. | on |
| `create_note` | Creates a note in the chosen notebook (default folder if omitted). | off |
| `update_note` | Patch title / body / notebook / todo state. Body changes can use `append`, `prepend`, or `replace_text` for small edits. | off |
| `delete_note` | Move to trash. Reversible by the user. | off |
| `manage_tags` | Add/remove tags by title. Missing tags in `add` are created. | off |
| `create_notebook` | Optionally nested under a parent. | off |

Write tools default off so users grant write access deliberately.

### Reading long notes

`read_note` caps output at 8000 characters by default, since the model cannot know a note's size before asking. `outline` and `section` are mutually exclusive:

| Params | Returns |
|---|---|
| none | Body, capped |
| `outline: true` | Heading structure only, no body |
| `section: "<addr>"` | That section, subsections included |

The outline is one tab-separated line per heading:

```
path	chars	heading
0	480	
1	60	Joplin release process
1.1	1600	Prerequisites
1.2	12400	Desktop
1.2.1	3600	Windows
```

`path` is positional and reflects nesting. Section `0` is the content before the first heading, omitted when empty; a note with no headings returns `0` alone, so the model reads its `chars` and falls back to paging.

`section` takes a path (`"1.2.1"`) or heading text (`"Windows"`), which must match exactly one heading — several matches is an error listing the candidates, never an arbitrary pick. A section runs to the next heading of equal or higher level.

Headings come from the app's markdown-it instance, so the outline matches the rendered note. Their whitespace is collapsed to single spaces, since newlines (multi-line setext headings) and tabs would break the line format; the `section` address is collapsed the same way, so a heading copied from the outline resolves.

The outline is paged exactly like the body — `body`, `body_length`, `body_offset`, `body_returned_chars`, `has_more`, with `is_outline` marking the mode. It needs paging because long notes have outlines bigger than the body cap they replace, and sharing the body's units keeps `offset` meaning characters in both modes. It's text rather than JSON because JSON roughly doubles the tokens for the same information.

Truncated responses include a message naming the alternatives, as `has_more` says output stopped but not what to do instead. `max_chars: 0` means no limit in both modes.

### Reading several notes

`read_notes(ids)` saves a round trip per search result. Unresolved ids go in `not_found` rather than failing the call.

The bodies share one 8000-character budget, so 10 notes don't cost 10× the context. Short notes take what they need and the rest is split over the longer ones; truncated notes have `has_more: true` and are followed up with `read_note`. More than 20 ids is an error, since a tiny share per note is worse than making the model pick.

### Related notes

`related_notes(id)` returns notes close in meaning to a note. It uses the stored vectors of the note so no embedding provider is needed. At most 10 vectors are used and they are spread over the note.

The source note is never returned and each note shows once with its best chunk. Results have the same fields as `semantic_search_notes` and take the same `relevance`, `notebook_id` and `tag_id`.

Errors are checked in this order: unsupported platform then embeddings not enabled then note not indexed yet.

### Search results carry their section

A `search_notes` result reports `section` (a positional path) and `section_heading` for the match, so the model can call `read_note(id, section)` directly instead of spending a round trip on the outline. Sections come from the same `noteSections` helper that backs the outline, so a path from search always resolves as a `read_note` address. Nested matches report the innermost section; matches before the first heading, and notes without headings, get section `0`.

Both fields are omitted when there is no body keyword to anchor on, as with a filter-only query like `title:Changelog`. Reporting the section containing offset 0 would point at section `1` — often the entire note.

The anchor is found in the raw body, since normalising whitespace shifts every offset after the first run and the result could not be mapped back to a section. The snippet takes an over-wide window around it and normalises afterwards for display.

### Why purpose-built and not a Data API wrapper

The Data API is a generic data front-end with pagination, fields parameters, and a full entity surface. An LLM doesn't need any of that — it needs a small, opinionated capability surface. Wrapping the Data API would force tool descriptions to explain Joplin internals (pagination cursors, available fields) rather than the operation itself.

The tools should not grow into a generic data layer. If a feature can't be expressed as a small, well-named operation, the right answer is usually a new tool, not flags on an existing one.

## Error model

Two error channels, deliberately distinct:

- **`ToolError`** thrown from a handler → `result.isError = true` with the error message as text. The LLM sees it and can recover ("note not found", "ambiguous match", missing parameter, etc.).
- **Any other `Error`** thrown from a handler → JSON-RPC `InternalError` (−32603). The MCP client treats this as a connection-level failure; the stack goes to the server log. The LLM does not see it as tool output.

The split lets us distinguish expected, LLM-recoverable failures from genuine bugs without designing a custom error-code system.

## Tool registry and toggles

`registry.ts` holds the static list of all tools. `findTool(id)` returns a tool only if it exists *and* its `ai.tool.<id>.enabled` setting is true. `enabledTools()` filters the same way.

Adding a tool means: write the file in `tools/`, register it in `registry.ts`, add the `ai.tool.<id>.enabled` setting to `builtInMetadata.ts`, and add it to the table above.

## Settings

All MCP settings live in the dedicated `ai.tools` section of Settings.

| Setting | Default | Purpose |
|---|---|---|
| `mcp.enabled` | false | Master toggle. Server returns 403 when off. |
| `ai.tool.<id>.enabled` | varies (see table above) | Per-tool toggle. Disabled tools are hidden from `tools/list`. |

There is no scope/permission system on the auth token — for v1, the per-tool toggles are the granularity. Token scopes could be added later without breaking existing setups.

## Why this lives inside the Web Clipper service

The Web Clipper already provides an authenticated localhost HTTP service that's enabled by users who want external integrations. Reusing it means no second port to open, no second token to manage, and no duplicate transport/CORS plumbing. The MCP server is unreachable when the Web Clipper is off, which is the right default.

## What's out of scope for v1

- **Stdio transport.** Host apps that don't support HTTP MCP servers need a bridge like `mcp-remote`.
- **Token scopes.** Per-tool toggles are enough until a real need surfaces.
- **Resource and prompt MCP primitives.** Only tools are exposed.
- **Streaming responses.** Every call is request/response.
- **Joplin running its own chat.** Chat is handled by the host AI app; Joplin is a tool surface, not an LLM consumer in this flow.
