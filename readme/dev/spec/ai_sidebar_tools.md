# AI sidebar: tool-using architecture

How the built-in AI chat sidebar evolves from a single-shot structured-output call into a tool-using agent, with a two-tier toolset and a plugin extension point.

The underlying `joplin.ai.chat()` primitive described in [ai_chat.md](ai_chat.md) is unchanged; this spec only covers the sidebar and adjacent internals.

## Motivating use cases

- **Cross-workspace operations from the sidebar.** "Find my last packing list and add socks to it" — today impossible because the sidebar is scoped to the focused note.
- **Plugin-owned chat behaviours.** *Vacation-list plugin*: user types "what do I need for 5 days in the Lake District with my dog"; the plugin's registered `plan_trip_packing` tool produces a structured list, fetches reference images for each item, and its custom renderer displays them inline in the chat. The plugin owns the domain (destination, weather, companions, image fetching); the model routes to it on intent.

## Motivation

The sidebar today (see `noteChat.ts`) makes one LLM call per user turn. The response is constrained by a JSON schema to `{ reply, edits[] }` where `edits[]` is a hard-coded enum of operations. Three consequences push us toward tool calling:

- The sidebar can only touch the focused note. Anything cross-workspace is impossible without leaving structured-output mode.
- Plugins have no seam to extend chat behaviour.
- Joplin already ships an MCP server ([ai_mcp.md](ai_mcp.md)) whose tools are the exact same operations we'd want the sidebar to perform (search, create, tag, link). Today they're consumed only by external hosts — duplicated capability.

## Design principle revision

[ai_primitives.md](ai_primitives.md) states *"MCP is a peer, not a client. Joplin itself is not an MCP client and does not host conversations."* Revised: **the built-in sidebar is an in-process consumer of the MCP tool implementations**, calling the same handlers as the MCP endpoint without going through JSON-RPC. External MCP clients remain the only network-facing consumers. Other primitives principles stand.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ ChatPanel (desktop) — conversation state, UI    │
└──────────────────┬──────────────────────────────┘
                   │ runNoteChat(context, history, msg)
                   ▼
┌─────────────────────────────────────────────────┐
│ noteChat — per-turn tool list, agent loop,      │
│           dispatch to tier handlers             │
└─────────┬──────────────────────────────┬────────┘
          ▼                              ▼
┌─────────────────────┐        ┌────────────────────────┐
│ Session tools       │        │ Workspace tools        │
│ (in-process,        │        │ (MCP registry —        │
│  editor-coupled)    │        │  built-in + plugin)    │
└─────────────────────┘        └────────────────────────┘
```

To the model, both tiers are opaque tools. Tier is a runtime-only concern: the dispatcher routes by tool ID.

## Two tiers, one interface

### Tier 1 — Session tools

In-process handlers with direct access to editor state (selection, cursor, note body, pending-diff queue, undo stack). They participate in the editor's command pipeline so AI edits coalesce into single undo steps and appear as streaming diffs the user can accept or reject. Not in the MCP registry, not exposed to external clients, not pluggable — see [Why session tools are not MCP tools](#why-session-tools-are-not-mcp-tools).

Initial set (mapping from current `EditOp` operations):

| Tool | Replaces | Availability |
|---|---|---|
| `edit_selection(text)` | `replaceSelection` | Selection present |
| `rewrite_paragraph(anchor, text)` | `replaceRange` | Note focused, no selection |
| `insert_before_anchor(anchor, text)` | `insertBefore` | Note focused, no selection |
| `insert_after_anchor(anchor, text)` | `insertAfter` | Note focused, no selection |
| `append_to_note(text)` | `appendToNote` | Note focused, no selection |
| `replace_structured_block(tag, text)` | `replaceFencedBlock` | Note focused, block present |

Selection scope enforcement (currently `enforceSelectionScope` in `noteChat.ts` moves from post-hoc filter to tool-list gate: when a selection exists, only `edit_selection` is offered. The dispatcher additionally rejects any call to a tool not in the current turn's list.

### Tier 2 — Workspace tools (MCP)

The existing MCP tool registry ([ai_mcp.md](ai_mcp.md)) — `search_notes`, `semantic_search_notes`, `read_note`, `list_notebooks`, `list_tags`, `create_note`, `update_note`, `delete_note`, `manage_tags`, `create_notebook`. Called in-process by the sidebar, bypassing JSON-RPC. One implementation, two consumers.

### Tier 3 — Plugin-registered tools

Plugins register additional workspace tools:

```typescript
joplin.ai.tools.register({
    id: string;
    description: string;
    inputSchema: JsonSchema;
    handler: (input) => Promise<unknown>;
    render?: (input, output) => RenderSpec;   // optional custom renderer
});
```

Registered tools appear alongside built-in workspace tools in the sidebar *and* through the MCP endpoint — a plugin tool works identically for the built-in sidebar and for Claude Desktop over HTTP. That symmetry is why plugin tools live at Tier 2, not their own tier.

The `render` field lets a plugin format its tool output (e.g. list-with-thumbnails for the vacation-list case). Absent, the result renders as collapsed JSON. Plugins never need to detect intent — the model routes on tool description.

Plugin tools run in the plugin sandbox with the usual message-passing overhead.

## How the model chooses which tool to call

Three mechanisms combine:

1. **The tool list.** Only tools present in the per-turn tools array are callable. The sidebar builds this list from context:
   - No note focused → workspace tools only.
   - Note focused, no selection → workspace tools + anchor / append session tools.
   - Note focused, selection present → workspace tools + `edit_selection` only.
   Same context-dependent logic today in `noteChat.ts`, lifted from "which JSON ops are legal" to "which tools appear."
2. **Tool descriptions.** The model routes on semantic intent match. No routing code, no intent classifier.
3. **The system prompt.** Frames Joplin context, current note title/body/selection (when focused), Joplin-Markdown rules (current `joplinMarkdownNotes` block survives verbatim), and instructs the model to scope edits to selection when one exists.

## Agent loop

```
runNoteChat(context, history, userMessage):
    tools = buildToolList(context)
    messages = [systemPrompt(context), ...history, {user, userMessage}]
    for step in 1..MAX_STEPS:
        result = AiService.chat(messages, {tools})
        if result.stopReason == 'tool_use':
            for call in result.toolCalls:
                output = dispatch(call)   // tier 1 handler or MCP tool
                messages.push({assistant, toolCalls: [call]})
                messages.push({tool, toolCallId: call.id, content: serialize(output)})
            continue
        return { reply: result.text, edits: <tier 1 calls this turn> }
    throw 'agent loop exceeded max steps'
```

`MAX_STEPS = 8`. `buildToolList` is a pure function of `NoteContext`; `dispatch` is a switch between the session-tools table and `mcpRegistry.findTool(id)`. The `{ reply, edits }` shape returned to ChatPanel is unchanged, so the existing `applyNoteEdits` pipeline keeps working — `edits` is now the accumulated tier-1 calls. Workspace tool calls appear as tool-use transcript entries, not edits.

## Why session tools are not MCP tools

- **Live context.** Selection/cursor change as the user clicks around. MCP is stateless — you'd either re-send full editor state on every call (wasteful, racy) or reach into shared UI state from the "server" (no longer stateless, unsafe for the network transport).
- **Undo integration.** An AI edit should be a single undoable step in the editor's history stack — requires going through the command pipeline, not applying an arbitrary diff.
- **Diff preview / accept-reject.** The existing UX is a *session* between LLM and editor, not a single call.

If we ever expose editor operations to external MCP clients, they'll be different tools — coarser, stateless, caller-supplied context on every call.
