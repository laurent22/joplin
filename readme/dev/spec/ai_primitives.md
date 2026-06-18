# AI primitives

This spec describes the AI primitives in Joplin. They are not features themselves; they are the foundation features and plugins are built on. Detailed specs for each primitive live in their own documents — links below.

## Target use cases

The primitives are designed against five concrete features. None of them are core Joplin features by themselves; they exist as the bar the primitives have to clear.

- **Chat with your note** — a sidebar that can summarise, rewrite, or answer questions about the current note.
- **Chat with your note collection** — ask a question across all notes and get a cited answer.
- **AI-based note categorisation and tagging** — background analysis that suggests tags and notebook structures based on note content.
- **AI-generated note graphs** — surfacing semantically related but unlinked notes.
- **Fuzzy semantic search** — finding notes by meaning rather than exact terms (e.g. "the note about pet sitters for my dog").

Each primitive serves at least two of these. Features build on top of these primitives, never alongside them.

## The primitives

1. **Provider abstraction** — pluggable layer for LLM and embedding models, so users can mix cloud, self-hosted, and on-device providers. See [ai_chat.md](ai_chat.md).
2. **Local embeddings index** — background-indexed semantic store, local-only, not synced. See [ai_embeddings.md](ai_embeddings.md).
3. **Retrieval helpers** — the shared query surface plugins call (`joplin.ai.search()`). Covered in [ai_embeddings.md](ai_embeddings.md).
4. **Privacy & cost guardrails** — enforced at the provider layer so every feature inherits them. Covered in [ai_chat.md](ai_chat.md).
5. **MCP server** — exposes Joplin notes to external AI tools. See [ai_mcp.md](ai_mcp.md).

## Design principles

A few rules carried through every primitive:

- **Off by default.** No AI capability is reachable without an explicit user opt-in, and remote providers need a second opt-in on top.
- **Plugins don't choose the provider.** Plugins write against `joplin.ai.chat()` and `joplin.ai.search()`; the user picks the active provider in settings. A plugin written against one provider works against all of them.
- **Local first.** The bundled embedding model is local; remote chat providers are optional. Users on small profiles (CLI, mobile) get clean degradation rather than broken features.
- **No conversation state in core.** Chat history, system prompts, retrieval orchestration, and UI all live in the feature (plugin or external app), not in the primitive. The primitives are stateless functions.
- **MCP is a peer, not a client.** The MCP server exposes Joplin to external AI apps as a tool surface. Joplin itself is not an MCP client and does not host conversations.
