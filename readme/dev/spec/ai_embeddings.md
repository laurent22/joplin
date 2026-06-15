# AI embeddings (implementation)

How Joplin builds and queries the local note-embeddings index. See
[ai_primitives.md](ai_primitives.md) for the user-facing spec and the
plugin-API design.

## Components

```
                          +-----------------------------+
                          |       Settings (UI)         |
                          |   ai.enabled,               |
                          |   ai.embedding.enabled,     |
                          |   model + indexer cursors   |
                          +-----------+-----------------+
                                      |
        BaseApplication.applyEmbeddingIndexerState()
                                      |
                                      v
+-----------------------+   +-------------------------+   +-----------------+
|  LocalEmbeddingProvider | | EmbeddingIndexer         | | AiIndexStatus    |
|  (or TestEmbedding-     | | (background, 5-min tick) | | (settings panel) |
|   Provider in CI)       | |                          | |                  |
|                         | |                          | |                  |
|  embed() / embedQuery() | |  - drain item_changes    | |  polls           |
|  + model download       |<+  - backfill not-yet-     | |  getStatus()     |
+-----------+-------------+ |    indexed notes         | +--------+---------+
            |               |  - call provider.embed   |          ^
            |               |  - persist via Note-     |          |
            |               |    Embedding.saveChunks  +----------+
            v               +-----------+--------------+
+-----------------------+               |
|  ONNX runtime         |               v
|  + transformers.js    |   +--------------------------+
|  (via shim.onnxRuntime) |  | NoteEmbedding (model)    |
+-----------------------+   |  - note_embeddings_meta  |
                            |    (regular table)       |
                            |  - note_embeddings_vec   |
                            |    (sqlite-vec virtual,  |
                            |     created lazily)      |
                            +-----------+--------------+
                                        ^
                                        |
                            +-----------+--------------+
                            |  SearchService           |
                            |  joplin.ai.search()      |
                            |  - resolve scope to ids  |
                            |  - embedQuery / reuse    |
                            |    stored vectors        |
                            |  - similaritySearch +    |
                            |    relevance preset      |
                            +--------------------------+
```

## Storage

Two tables:

- **`note_embeddings_meta`** — regular SQLite table created by migration 52.
  One row per chunk: `id`, `note_id`, `chunk_index`, `model_id`, `chunk_text`,
  `created_time`. The `id` is also used as the rowid in the companion vec
  table.
- **`note_embeddings_vec`** — a sqlite-vec `vec0` virtual table created
  lazily on first save (`NoteEmbedding.ensureVecTable(dimension)`). Dimension
  is fixed at table creation; changing it requires dropping the table.
  Stored vectors are L2-normalised so cosine similarity ≈ `1 − L2²/2`.

Joined by rowid. Vectors and metadata are deleted together (`deleteByNoteId`,
`clearAll`). Embeddings are local only — they are **never synced**.

## Indexer

`EmbeddingIndexer` runs in the background:

- **Cadence**: 5-minute interval matching `OcrService`. The first tick fires
  fire-and-forget at startup so model load doesn't block the splash screen.
- **Two-phase tick**:
  1. **Change drain.** Read `BATCH_SIZE` rows from `item_changes` past
     `ai.embedding.lastProcessedChangeId`. Collapse duplicates (multiple
     edits to the same note within a batch → one embed). Process deletes
     by removing the note's chunks; process create/update by re-indexing.
     Advance the cursor to the highest id seen.
  2. **Backfill top-up.** If the change drain processed fewer than
     `BATCH_SIZE` notes, fill the remaining slot with
     `NoteEmbedding.notYetIndexedNoteIds(remaining)` — picks up existing
     notes from before AI was enabled, in arbitrary order.
- **Per-note processing** (`indexNote`):
  1. Skip if missing / trashed / conflict / empty body+title.
  2. Chunk the body via `chunkText` (see Chunking below).
  3. Inject the title **doubled** into chunk 0. The title is often the
     densest semantic signal a note carries; doubling boosts its weight in
     the chunk's embedding so title-anchored queries match.
  4. Call `provider.embed(chunks)`.
  5. Persist via `NoteEmbedding.saveChunks` — which deletes the note's
     existing chunks first, so the operation is idempotent under crash and
     restart.
- **Model change**: on every tick, compare the active provider's `modelId`
  to `ai.embedding.lastIndexedModelId`. On mismatch, wipe the index and reset
  the cursor.

### Durable state

| Setting key                            | Purpose                                       |
|----------------------------------------|-----------------------------------------------|
| `ai.embedding.enabled`                 | User kill switch (defaults to true with AI on)|
| `ai.embedding.lastProcessedChangeId`   | Cursor into `item_changes`                    |
| `ai.embedding.lastIndexedModelId`      | Detects model swap → triggers re-index        |

### What's deliberately not durable

- Maintenance running flag (`maintenanceRunning_`) and timer handle live in
  memory only. A crash mid-tick leaves the cursor at its pre-tick value, so
  the next run reprocesses the partial batch. `saveChunks` is idempotent so
  this is safe.

## Chunking

`chunker.ts` splits a note body into fixed-size character windows with 10%
overlap. The window size targets the model's 512-token context:
`chunkSize = TARGET_TOKENS_PER_CHUNK × CHARS_PER_TOKEN`. Two profiles:

| Profile  | chars/token | When                                   |
|----------|-------------|----------------------------------------|
| default  | 3.5         | Latin scripts (conservative for FR/DE) |
| CJK      | 1.2         | Note is ≥ 30% CJK characters           |

CJK detection uses a Unicode block regex and `scriptType()` to avoid
switching profiles for a single loanword.

## Provider abstraction

`EmbeddingProvider` (in `services/ai/types.ts`) is the interface every
provider implements:

```ts
interface EmbeddingProvider {
    id: string;
    modelId: string;
    dimension: number;
    classification: 'local' | 'remote';
    embed(texts: string[]): Promise<number[][]>;
    embedQuery?(texts: string[]): Promise<number[][]>;
    modelDownloadStatus?(): Promise<ProviderModelDownloadStatus>;
}
```

- `embedQuery` is optional. e5-family models use asymmetric `passage: ` /
  `query: ` prefixes — `SearchService` falls back to `embed` when a provider
  doesn't expose it.
- `modelDownloadStatus` is optional. Providers without a downloadable
  artefact (remote chat providers, the test stub) are treated as
  always-ready.

### LocalEmbeddingProvider

Bundled provider for the desktop app. Runs `multilingual-e5-small` quantised
to int8 (`model_quantized.onnx`, ~140 MB) via `onnxruntime-node`, with
tokenisation delegated to `@xenova/transformers`' `AutoTokenizer`.

- **Threading**: `intraOpNumThreads: 2`. Caps CPU use so the background
  indexer doesn't peg every core.
- **Single-flight init**: `ensureInitialised()` caches the load promise.
  On rejection the cache is dropped so the next call retries cleanly.
- **token_type_ids**: e5's ONNX export demands this input even though
  XLM-RoBERTa is single-segment. transformers.js doesn't emit it for XLM-R,
  so we synthesise a zero tensor matching the input shape when the session
  requires it.
- **Output**: mean-pooled over the attention mask, L2-normalised, returned
  as `number[][]` of `dimension` 384.

#### ESM-from-CJS shim

`@xenova/transformers` is ESM-only. We can't `require()` it directly, and
several intermediate approaches fail in Joplin's environment. The current
working solution is `dynamicEsmImport.js`, which uses Node's
`require(esm)` (stable since Node 22.12). See the file's comment for the
list of approaches that didn't work and why.

`engines.node >= 22.12` is enforced at install time so this never fails on a
machine that successfully built the project.

### TestEmbeddingProvider

Deterministic bigram-based stub. Same text → same vector; similar texts
produce closer vectors. Not a real model — it can't capture multi-word
semantics or synonyms. Used by every embedding test that needs the indexer
to do something without downloading the real model.

## Model download

`EmbeddingModelDownloader` downloads the model tarball from a GitHub Release
to `${cacheDir}/ai/embedding-models/<archiveName>/`:

- **Single-flight**: an `inFlight` Map ensures concurrent callers share one
  download instead of racing on the same target directory.
- **Marker file**: `config.json` inside the model dir is the "is the model
  cached?" signal. A successful extract always leaves it behind.
- **Resilience**: stale tarballs and partial extracts are wiped before each
  download attempt. After extraction the marker is verified; missing →
  error.
- **Timeout**: `shim.fetchBlob` is called with a 60-second per-socket-idle
  timeout. Without it a stalled connection would hang every concurrent
  caller indefinitely.

## Search

`SearchService.search(options)` is the entry point. It backs
`joplin.ai.search()` and any future core search integrations.

```ts
interface SearchOptions {
    query: { text: string } | { noteId: string };
    scope?: { type: 'all' | 'note' | 'folder' | 'tag', ... };
    relevance?: 'strict' | 'normal' | 'loose';   // default 'normal'
}
```

Flow:

1. **Provider check.** Throws if no embedding provider is active.
2. **Resolve query → vectors.**
   - `{ text }`: `provider.embedQuery([text])` (or `embed` if not asymmetric).
   - `{ noteId }`: `NoteEmbedding.vectorsByNoteId(noteId)` — reuses stored
     vectors, no re-embedding pass.
3. **Resolve scope → noteIds.** `'all'` → null (no restriction); `'note'` →
   `[noteId]`; `'folder'` → `Note.previews(folderId)`; `'tag'` →
   `Tag.noteIds(tagId)`. Empty list short-circuits.
4. **Per query vector, similaritySearch** with `k = relevance.k`.
5. **Score conversion.** L2 distance → cosine similarity in `[0, 1]` via
   `1 − d²/2` (exact for unit vectors). Filter by `relevance.minScore`.
6. **Merge + sort.** Dedupe by `(noteId, chunkIndex)` keeping highest score,
   sort descending, trim to `k`.

### Relevance presets

Currently tuned for `multilingual-e5-small`:

| Preset  |  k | minScore |
|---------|---:|---------:|
| strict  |  5 |     0.55 |
| normal  | 10 |     0.40 |
| loose   | 20 |     0.25 |

These are internal — plugins target the preset name, we own the mapping.
When the bundled model changes we re-tune. `RELEVANCE_DEFAULTS` becomes a
per-modelId map at that point.

## Settings UI

`AiIndexStatus.tsx` is the read-only status panel rendered under the AI
section header. Polls `EmbeddingIndexer.getStatus()` on a chained
`setTimeout` (not `setInterval` — that would let slow polls stack up
during model load).

Reports:

- **Model:** `Not started` / `Downloading…` / `Downloaded` /
  `Unavailable on this platform`.
- **Indexer:** `Idle` / `Indexing…` / `AI is disabled` /
  `Indexing is disabled`.
- **Indexed notes:** `N / total`, excluding trashed and conflict notes.

## Platform support

| Platform                | Embeddings | Notes                                |
|-------------------------|:----------:|---------------------------------------|
| macOS Apple Silicon     |     ✓      |                                       |
| macOS Intel             |     ✗      | `onnxruntime-node` ships no darwin-x64|
| Linux x64 / arm64       |     ✓      |                                       |
| Windows x64 / arm64     |     ✓      |                                       |
| CLI / mobile / server   |     ✗      | No ONNX wired in; degrades cleanly    |

Unsupported platforms: `shim.onnxRuntime()` returns null, no provider gets
installed, the indexer stays paused, search throws a clear error. Chat
(remote providers) still works.

## Performance notes

- **Model load** (one-time per process): ~2–5 s on Apple Silicon, 5–15 s on
  x86 CPU. Happens silently in the background on app startup.
- **Per-chunk inference**: ~30–80 ms on Apple Silicon, 80–200 ms on x86.
- **Indexer throughput**: serial today — one note at a time, one chunk at a
  time within each note (the embed call takes a chunks array but
  `EmbeddingIndexer.indexNote` calls it per note). Batching across notes
  would be ~5–10× faster for large backlogs; not done for v1.
- **Search latency**: vec0 MATCH is sub-millisecond on tens of thousands of
  chunks. Dominated by the query embedding pass.
- **First-time backfill** on a large vault: 100 notes per 5-minute tick.
  10k notes ≈ 8 hours of background indexing. Acceptable for now; tighten
  pacing or batch sizes if it becomes a problem.

## Testing

- **Unit tests** for `chunker`, `NoteEmbedding`, `EmbeddingIndexer`,
  `SearchService`, `EmbeddingModelDownloader`, `LocalEmbeddingProvider`.
  All use the `TestEmbeddingProvider` and stubbed shims — no network, no
  real model.
- **Gated real-model test**: `LocalEmbeddingProvider.test.ts` includes one
  test gated behind `JOPLIN_RUN_REAL_EMBEDDING_TEST=1`. It downloads the
  real model and verifies it loads end-to-end. Stops short of inference
  because Jest's VM sandbox rejects the model's output `Float32Array` as
  cross-realm — verify inference by running the desktop app.

  Run with:
  ```
  cd packages/lib && JOPLIN_RUN_REAL_EMBEDDING_TEST=1 yarn test LocalEmbeddingProvider
  ```
