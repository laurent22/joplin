# AI primitives

This spec describes the core AI primitives in Joplin. The goal is not to ship a single AI feature, but to provide a platform on which features and plugins can be built. The primitives below are validated against five target use cases:

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

## Implementation status

| Primitive                           | Status                                                                 |
|-------------------------------------|------------------------------------------------------------------------|
| Provider abstraction (chat)         | Shipped (Joplin Cloud, OpenAI-compatible, Anthropic)                   |
| Provider abstraction (embeddings)   | Shipped (local ONNX-backed)                                            |
| Local embeddings index              | Shipped — multilingual-e5-small, downloaded on first enable            |
| Retrieval helpers (`search`)        | Shipped as `joplin.ai.search()`                                        |
| Chat helper (`chat`)                | Shipped as `joplin.ai.chat()`                                          |
| Privacy & cost guardrails           | Shipped (off by default, remote-allow flag, classification, token tally)|
| MCP server                          | Not started                                                            |

Implementation detail for the embeddings stack lives in [ai_embeddings.md](ai_embeddings.md).

## 1. Provider abstraction

A pluggable layer so users can pick their LLM and embedding model independently (cloud, self-hosted, or on-device). No provider is hardcoded.

Two models are configured independently:

- **Chat model** — generates and transforms text (summaries, rewrites, answers).
- **Embedding model** — turns text into vectors for retrieval.

Users may legitimately mix providers (e.g. a cloud chat model with a local embedding model) so the API treats them as two separate slots.

### Configured providers and the active provider

Users configure a **list** of providers (each with its own settings — API key, base URL, model name) and select one as **active** for chat and one as active for embeddings.

### Built-in providers

Chat:

- **Joplin Cloud AI** — zero-config for users on Joplin Cloud sync.
- **OpenAI-compatible** adapter (covers OpenAI, Ollama, LM Studio, vLLM, OpenRouter, and similar via base-URL override).
- **Anthropic** adapter.

Embeddings:

- **Bundled local embedding provider** (see below).

### Chat API

Plugins call `joplin.ai.chat(messages, options?)`. The active provider and model are taken from user settings — plugins cannot pick a model. Throws if AI is disabled, if the active provider is remote and the user hasn't allowed remote providers, or if the provider is misconfigured.

## 2. Local embeddings index

Notes are chunked, embedded, and stored locally, so retrieval can run without a network call. Embeddings are **not synced**: they are large, model-specific, and re-derivable. The model identifier is stored alongside each chunk, so a model change triggers a clear-and-rebuild rather than silent corruption.

Indexing runs as a background service: on first enable it walks the entire vault, after which it follows the note-change feed incrementally. New and edited notes become searchable within minutes.

The bundled model is the default. Users may switch to a different embedding provider via the provider abstraction; doing so triggers a re-index because vectors from different models aren't comparable.

### Platform scope

- **Desktop on Apple Silicon macOS, Linux x64/arm64, Windows x64/arm64**: full support.
- **macOS Intel**: chat works; embeddings do not (no ONNX prebuild for `darwin-x64`).
- **CLI / mobile / server**: no on-device embeddings. Chat with remote providers still works.

Implementation detail lives in [ai_embeddings.md](ai_embeddings.md).

## 3. Retrieval helpers

The shared query surface. All five target features differ mainly in *what* they retrieve — same machinery, different scope.

### API

Plugins call `joplin.ai.search({ query, scope?, relevance? })`. Returns matching chunks with the source note id, chunk text, and a similarity score.

- `query`: either plain text or `{ noteId }` to find chunks similar to an existing note. Note-id queries reuse the note's already-indexed chunks as the query — no re-embedding needed. This is what tag-suggestion and semantic-graph use cases rely on.
- `scope`: `all` (default), `note`, `folder`, or `tag`. Trashed and conflict notes are always excluded.
- `relevance`: `strict` / `normal` / `loose`. A preset that maps internally to model-appropriate values for the number of results returned and the minimum similarity threshold.

Raw thresholds (`k`, `minScore`) are a leaky abstraction: the right values depend on the embedding model, and silently break when the model changes. Plugins calibrated against one model would produce poor results against another with no signal that anything had changed.

The `relevance` preset is the contract plugins write against. Joplin owns the mapping from preset to numeric values per model. When the bundled model changes, the mapping is re-tuned and plugins continue working without modification.

### Hybrid search

Retrieval may eventually be combined internally with the existing FTS-based keyword search. Plugins will not see a contract change when hybrid ranking lands.

### Prior art

The [Jarvis](https://github.com/alondmnt/joplin-plugin-jarvis) plugin already exposes a [semantic search API](https://github.com/alondmnt/joplin-plugin-jarvis/blob/master/docs/API.md) to other plugins, supporting both free-text and note-ID queries. It is a useful reference.

### Mapping to features

How each target use case composes the primitives:

| Feature                  | Retrieval scope             | Then                                     |
|--------------------------|-----------------------------|------------------------------------------|
| Chat with note           | `note` or `folder`          | Pass chunks as context to chat model     |
| Chat with note collection | `all`                      | Pass top chunks (with note IDs) as context to chat model |
| Fuzzy search             | `all`                       | Show chunks directly as results          |
| Tag suggestions          | `all`, query = note content | Inspect tags of returned chunks          |
| Semantic graph           | `all`, per note             | Use scores as edge weights               |

Chat-based features additionally pass each chunk's source note ID into the prompt so the LLM can cite sources back to the user as clickable links.

## 4. Privacy & cost guardrails

Enforced at the provider layer so every feature — core or plugin — inherits these checks automatically.

### Requirements

- **AI features off by default.** A top-level toggle, plus a per-feature kill switch for the embeddings indexer (users who want chat-only).
- **Offline by default**: remote providers require a separate explicit opt-in.
- **Per-provider classification** as `local` or `remote`. OpenAI-compatible providers can be either depending on the configured base URL (loopback addresses count as local).
- **Token accounting** per provider, queryable by plugins and shown in settings.
- **No silent enablement.** Switching from a local to a remote provider requires an explicit user choice; auto-defaults (e.g. selecting Joplin Cloud AI for Joplin Cloud users on first enable) only apply once.

## 5. MCP server

> Status: not started. Design recorded here for reference.

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