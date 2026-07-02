# Semantic search (AI embeddings)

Joplin can index your notes so they can be searched by **meaning** rather than just by exact words. For example, searching for "the note about pet sitters for my dog" can find a note titled "Vet contacts" if its body mentions someone who walks dogs, even when "pet sitter" never appears in either.

This is sometimes called **semantic search** or **vector search**. It complements Joplin's regular keyword search — it doesn't replace it.

## How it works

When you enable AI, Joplin downloads a small language model (around 140 MB) onto your computer. From then on it runs in the background, reading each note and storing a numerical fingerprint of it in a local index. When you search, your query gets the same treatment and Joplin returns the notes whose fingerprints are closest.

All of this runs **entirely on your device**. The model is local; no note content is sent to a cloud service. The index is also local — it is not synced — so each device builds its own.

## Turning it on

1. Open the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) and go to the **AI** section.
2. Tick **Enable AI features**.
3. Leave **Enable the embeddings indexer** ticked (it is on by default).

The first time you do this Joplin downloads the model. After that it starts indexing your notes in the background.

## Tracking progress

Settings → AI shows the indexer's state and how many notes have been processed so far. The first time, indexing the entire vault can take a while — Joplin processes 100 notes every 5 minutes to keep the load on your machine very small. A 10 000-note vault takes roughly 8 hours of background work. You can leave it running and use Joplin normally; there's no rush.

After the initial scan, new and edited notes are picked up within a few minutes.

## Using it

There is no dedicated "semantic search" box in Joplin's UI today. Semantic search is exposed in two ways:

- **Plugins** can call `joplin.ai.search()` to look up notes by meaning. The plugin's description tells you whether it uses this.
- **External AI apps** (Claude Desktop, Cursor, etc.) can use it through the [MCP server](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_mcp.md), via the `semantic_search_notes` tool.

If you want to try it directly, the MCP server is the easiest path.

## Switching providers / re-indexing

If you change the embedding model — for example by switching providers — Joplin **wipes the index and rebuilds it**. Fingerprints from different models aren't comparable, so a clean rebuild is the only safe option. The indexer status panel shows what's happening.

## Platform support

| Platform | Embeddings work? |
|---|---|
| macOS (Apple Silicon) | Yes |
| macOS (Intel) | No — the underlying runtime isn't shipped for this architecture; AI chat still works. |
| Windows (x64, ARM64) | Yes |
| Linux (x64, ARM64) | Yes |
| Mobile, CLI | No — semantic search runs only on the desktop app. |

On platforms where embeddings don't work, the indexer stays paused and any plugin or MCP tool that needs it shows a clear error rather than silently returning nothing.

## Disabling the indexer

You can keep AI chat on but turn off the indexer by unticking **Enable the embeddings indexer** in Settings → AI. The model stays downloaded but no further indexing happens. Existing index data stays on disk; remove the AI profile data manually if you want to delete it completely.
