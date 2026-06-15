# AI embeddings (implementation)

How Joplin builds and queries the local note-embeddings index. See [ai_primitives.md](ai_primitives.md) for the user-facing spec.

## Overview

```
        Notes  ──►  EmbeddingIndexer  ──►  embedding provider  ──►  NoteEmbedding
                   (background, 5 min)        (local ONNX)            (sqlite-vec)
                                                                          ▲
                                                                          │
                                  SearchService  ◄──  joplin.ai.search()  │
                                                                          │
                                  AiIndexStatus  ──►  reads counts ───────┘
                                  (settings panel)
```

- **EmbeddingIndexer** watches note changes, chunks each note, asks the active provider to embed the chunks, and persists them.
- **NoteEmbedding** is the storage model. Metadata sits in a regular table; vectors sit in a sqlite-vec virtual table. Joined by rowid.
- **LocalEmbeddingProvider** runs `multilingual-e5-small` via ONNX. The model (~140 MB) is downloaded from a GitHub release on first AI enable.
- **SearchService** backs `joplin.ai.search()`. Takes a text or note-id query and a scope, returns ranked chunks.
- **AiIndexStatus** is the settings panel that shows model + indexer state.

## Indexer behaviour

The indexer runs on a 5-minute timer (matching `OcrService`) and has two modes:

- **Initial scan.** On first enable (or after a model swap), walk the entire notes table one 100-note batch per tick. At the start of the scan the change-feed cursor is snapped to the current `lastChangeId` so edits made *during* the scan are picked up normally by the change feed when the scan finishes. The scan is complete when no indexable notes remain that aren't already in `note_embeddings_meta`; at that point `ai.embedding.initialScanDone` flips to true.
- **Change feed.** Once the scan completes, only the change-feed loop runs. Each tick drains `item_changes` past the durable cursor, collapses duplicates, processes deletes/creates/updates, then advances the cursor.

**Order of processing during the scan**: unspecified. The "not yet indexed" query has no `ORDER BY`, so SQLite returns rows in storage order (roughly insertion order). Determinism doesn't matter for the final state — every indexable note ends up embedded.

**Resume across restarts**: free because progress is the disk state, not a counter. After a restart the indexer re-enters scan mode (flag still false) and the `NOT EXISTS` query naturally skips notes that already have rows. Already-indexed notes from the previous session don't get re-processed.

**Failure handling during the scan**: per-note failures are logged, and the note is added to an in-memory skip set for the rest of the session — no retry loop, no log flood. The skip set is **not** persisted, so the next process restart retries the previously failed notes.

Once the scan completes, the indexer never sweeps the notes table again. A note that failed during the scan only gets re-tried if (a) the user edits it (the change feed picks it up), or (b) the model id changes (full re-scan). It will not be retried just because time passed.

Per note, the title is injected (doubled) into chunk 0. Without this, notes whose body is just an attachment link would never match title-anchored queries.

The first tick fires fire-and-forget at startup, so the model load doesn't block the splash screen. A model id change (e.g. switching providers) wipes the index, clears the scan flag, and rebuilds.

## Chunking

Fixed-size character windows sized to fit the model's 512-token context, with 10% overlap. Two profiles: a Latin-script default and a CJK profile (used when CJK is the dominant script — CJK tokenises ~3× denser).

## Search

- `query: { text }` runs the active provider's query-side encoding.
- `query: { noteId }` reuses the note's stored vectors as the query — no re-embedding pass.
- `scope`: `all` / `note` / `folder` / `tag`. Trashed and conflict notes are always excluded.
- `relevance`: `strict` / `normal` / `loose`. Maps internally to model-specific `(k, minScore)` so plugins survive model changes.
- Score is cosine similarity in `[0, 1]`, computed from the L2 distance sqlite-vec returns (vectors are L2-normalised, so `cos = 1 − d²/2`).

## Platform support

| Platform                | Embeddings | Notes                                  |
|-------------------------|:----------:|----------------------------------------|
| macOS Apple Silicon     |     ✓      |                                        |
| macOS Intel             |     ✗      | `onnxruntime-node` ships no darwin-x64 |
| Linux x64 / arm64       |     ✓      |                                        |
| Windows x64 / arm64     |     ✓      |                                        |
| CLI / mobile / server   |     ✗      | No ONNX wired in; chat still works     |

Unsupported platforms degrade cleanly: the provider isn't installed, the indexer stays paused, search throws a clear error.

## Performance, in rough numbers

- Model load: 2–15 s (one-time per process, runs in the background).
- Per-chunk inference: 30–200 ms depending on CPU.
- Search latency: dominated by the query-embedding pass; the vec MATCH itself is sub-millisecond on tens of thousands of chunks.
- Big vaults take a while: 100 notes per tick × 5-min interval, so a fresh 10k-note vault is ~8 hours of background indexing. Intentional pacing.

## Durable state

| Setting                                | Purpose                          |
|----------------------------------------|----------------------------------|
| `ai.enabled`                           | Top-level AI toggle              |
| `ai.embedding.enabled`                 | Indexer kill switch (default on) |
| `ai.embedding.lastProcessedChangeId`   | Cursor into `item_changes`       |
| `ai.embedding.lastIndexedModelId`      | Detects model swap → re-index    |
| `ai.embedding.initialScanDone`         | True once the full-vault scan finished |
