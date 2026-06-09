# AI primitives

This spec describes the core AI primitives that will be added to Joplin. The goal is not to ship a single AI feature, but to provide a platform on which features and plugins can be built. The primitives below are validated against five target use cases:

- **Chat with your note** — a sidebar that can summarise, rewrite, or answer questions about the current note.
- **Chat with your note collection** — ask a question across all notes and get a cited answer.
- **AI-based note categorisation and tagging** — background analysis that suggests tags and notebook structures based on note content.
- **AI-generated note graphs** — surfacing semantically related but unlinked notes.
- **Fuzzy semantic search** — finding notes by meaning rather than exact terms (e.g. "the note about pet sitters for my dog").

Each primitive below should plausibly serve at least two of these use cases. Features should be built on top of these primitives, never alongside them.

## Overview

The primitives are:

1. **Provider abstraction** — pluggable layer for LLM and embedding models.
2. **Local embeddings index** — background-indexed semantic store, local-only, not synced.
3. **Retrieval helpers** — the shared query surface that plugins actually call.
4. **Privacy & cost guardrails** — enforced at the provider layer so every feature inherits them.
5. **MCP server** — exposes Joplin notes to external AI tools.

Primitives 1–3 are required for any of the five target use cases to work. Primitive 4 must be in place from day one. Primitive 5 is independently valuable and can ship in parallel.

## 1. Provider abstraction

A pluggable layer so users can pick their LLM and embedding model independently (cloud, self-hosted, or on-device). No provider is hardcoded.

Two models are configured independently:

- **Chat model** — generates and transforms text (summaries, rewrites, answers).
- **Embedding model** — turns text into vectors for retrieval.

Users may legitimately mix providers (e.g. a cloud chat model with a local embedding model) so the API treats them as two separate slots.

### Configured providers and the active provider

Users configure a **list** of providers (each with its own settings — API key, base URL, model name) and select one as **active** for chat and one as active for embeddings.

### Built-in providers

- An **OpenAI-compatible** adapter (covers OpenAI, Ollama, LM Studio, vLLM, OpenRouter, and similar via base-URL override).
- An **Anthropic** adapter.
- A **bundled local embedding model** (see below)

## 2. Local embeddings index

Notes are chunked, embedded, and stored locally so retrieval can run without a network call.

### Storage

- A new local SQLite table holding `(note_id, chunk_index, model_id, vector)` and the source text of each chunk.
- Implemented using the [sqlite-vec](https://github.com/asg017/sqlite-vec) extension for vector storage and similarity search.
- **Not synced.** Embeddings are large, model-specific, and re-derivable.
- Schema includes the model identifier so a model change triggers a re-index rather than silent corruption.

### Indexing

- Background task following the existing OCR Service pattern: timer-based, polls `ItemChange`, processes in chunks, persists progress in a settings key.
- Chunking strategy: roughly 512–1024 tokens with overlap. Tunable internally.

### Embedding model

- Joplin ships a small embedding model (~100MB, e.g. from the nomic/mxbai/bge family) bundled with the desktop app, or downloaded after installation.
- Runtime: **ONNX Runtime** (`onnxruntime-node`), loaded in-process. No external service, daemon, or Python required.
- The bundled model is the default. Users may switch to a cloud embedding provider via the provider abstraction; doing so triggers a re-index.

### Platform scope

- **Desktop and CLI**: full support.
- **Mobile**: deferred. sqlite-vec packaging for iOS/Android and on-device embedding cost on mobile are separate efforts. Mobile may eventually query an existing index produced on desktop, but that is out of scope for the initial work.

## 3. Retrieval helpers

The shared query surface. All five target features differ mainly in *what* they retrieve — same machinery, different scope.

### API

A single primary call:

- **`search({ query, scope, relevance })`** — returns matching chunks with their source note ID, the chunk text, and a similarity score.
  - `query`: either plain text (embedded internally using the active embedding provider) or `{ noteId }` to find chunks similar to an existing note. When a note ID is given, Joplin reuses the note's already-indexed chunks as the query vector(s), so no re-embedding is needed. This is what the tag-suggestion and semantic-graph use cases rely on.
  - `scope`: where to search. One of `'note'` (with a note ID), `'notebook'` (with a folder ID), `'tag'` (with a tag ID), or `'all'`. Trashed and conflict notes are excluded by default.
  - `relevance`: `'strict' | 'normal' | 'loose'`. A preset that maps internally to model-appropriate values for the number of results returned (`k`) and the minimum similarity threshold.

Raw thresholds (`k`, `minScore`) are a leaky abstraction: the right values depend on the embedding model, and silently break when the model changes. Plugins calibrated against one model would produce poor results against another with no signal that anything had changed.

The `relevance` preset is the contract plugins write against. Joplin owns the mapping from preset to numeric values per model. When the bundled model changes, the mapping is re-tuned and plugins continue working without modification.

### Default mappings

Reference defaults (subject to per-model calibration):

| `relevance` preset   | k  | minScore (cosine) |
|----------|----|-------------------|
| strict   | 5  | ~0.55             |
| normal   | 10 | ~0.40             |
| loose    | 20 | ~0.25             |

These are internal values and are not part of the public API contract.

### Hybrid search

Retrieval may be combined internally with the existing FTS-based keyword search. This is an implementation detail; plugins still call `search()` with the same shape.

### Prior art

The [Jarvis](https://github.com/alondmnt/joplin-plugin-jarvis) plugin already exposes a [semantic search API](https://github.com/alondmnt/joplin-plugin-jarvis/blob/master/docs/API.md) to other plugins, supporting both free-text and note-ID queries. It is a useful reference for anyone wanting to prototype against the shape proposed here.

### Mapping to features

How each target use case composes the primitives:

| Feature                  | Retrieval scope             | Then                                     |
|--------------------------|-----------------------------|------------------------------------------|
| Chat with note           | `note` or `notebook`        | Pass chunks as context to chat model     |
| Chat with note collection | `all`                      | Pass top chunks (with note IDs) as context to chat model |
| Fuzzy search             | `all`                       | Show chunks directly as results          |
| Tag suggestions          | `all`, query = note content | Inspect tags of returned chunks          |
| Semantic graph           | `all`, per note             | Use scores as edge weights               |

Chat-based features additionally pass each chunk's source note ID into the prompt so the LLM can cite sources back to the user as clickable links.

## 4. Privacy & cost guardrails

Enforced at the provider layer so every feature (core or plugin) inherits these checks automatically.

### Requirements

- **AI features off by default.** A single top-level setting plus per-feature toggles.
- **Offline by default**: User must explicitly grant permission to use online features.
- **Per-provider classification** as `local` or `remote`. Surfaced in the provider picker and used by the indicator.
- **Token accounting** per provider, queryable by plugins and shown to users.
- **No silent enablement.** Switching from a local to a remote provider requires explicit user confirmation, with clear text about what data will be sent and where.

## 5. MCP server

Joplin runs an optional [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes notes to external AI applications (Claude Desktop, ChatGPT desktop, Cursor, Zed, etc.).

### Scope

The server exposes a minimal tool surface:

- Search notes
- Read note by ID
- Create note
- Update note
- List notebooks and tags

### Implementation

- Built as a thin protocol adapter on top of the existing Data API.
- Auth uses the same token model as the Data API.
- Disabled by default; enabled from the same settings page as the Web Clipper.
- **Per-tool toggles.** Each MCP tool (search, read, create, update, list, etc.) can be individually enabled or disabled in settings, so users can grant external apps read-only access without exposing write operations.

### Why it belongs in this spec

The MCP server is not required for the five target use cases, but it is the cheapest way to make Joplin a first-class participant in the broader AI tool ecosystem without building any chat UI. It also exercises the same note-access surface that internal AI features will need, so the two efforts share infrastructure.