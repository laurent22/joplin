# MCP server (connecting Joplin to AI apps)

Joplin can be exposed to external AI applications — such as Claude Desktop, Cursor, or Zed — through a small server that speaks the [Model Context Protocol](https://modelcontextprotocol.io/). Once you turn it on, those apps can search your notes, read them, and (if you allow it) create or update notes from a conversation.

The MCP server is **off by default**. Joplin itself is never the one talking to a model — it just answers questions from whichever AI app you've connected.

## What an AI app can do with it

Joplin exposes a small, fixed set of tools. Each can be turned on or off individually.

| Tool | What it does | Default |
|---|---|---|
| Search notes | Keyword search using Joplin's regular search syntax. | On |
| Semantic search | Search by meaning, using the [local embeddings index](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_semantic_search.md). | On |
| Read note | Return one note (title, markdown body, notebook, tags). | On |
| List notebooks | List notebooks with their hierarchy. | On |
| List tags | List tags. | On |
| Create note | Create a new note in a chosen notebook. | **Off** |
| Update note | Change the title, body, notebook, or to-do state of an existing note. | **Off** |
| Trash note | Move a note to the trash. | **Off** |
| Edit tags on a note | Add or remove tags by title. | **Off** |
| Create notebook | Create a new notebook, optionally inside an existing one. | **Off** |

The "write" tools default to off so you have to deliberately let an AI app modify your data.

## Turning it on

The MCP server runs on top of the [Web Clipper service](https://github.com/laurent22/joplin/blob/dev/readme/apps/clipper.md), so the Web Clipper must be running.

1. Open the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) and go to **Web Clipper**. Make sure the service is started, and note the port number and authorisation token.
2. Go to the **MCP** section. Tick **Enable MCP server**.
3. Decide which tools to allow. The read-only tools are pre-ticked; the write tools are not.

Joplin's MCP server is HTTP-based and listens on the same port as the Web Clipper.

## Connecting Claude Desktop

Claude Desktop doesn't speak HTTP MCP servers directly; it needs a small bridge called [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). You don't need to install it — it'll be downloaded automatically the first time.

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on Windows / Linux, and add:

```json
{
    "mcpServers": {
        "joplin": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-remote",
                "http://127.0.0.1:PORT/mcp?token=YOUR_TOKEN"
            ]
        }
    }
}
```

Replace `PORT` with the Web Clipper port and `YOUR_TOKEN` with the authorisation token. Restart Claude Desktop. The Joplin tools become available to Claude when it judges them useful.

There's no list of MCP tools visible in Claude Desktop's UI today. The easiest way to verify is to ask Claude a question that requires note access — for example "What notebooks do I have in Joplin?".

## Connecting other apps

Cursor, Zed, and a growing number of editors support MCP. The setup follows the same shape: point them at `http://127.0.0.1:PORT/mcp?token=YOUR_TOKEN`, possibly via the same `mcp-remote` bridge. Consult the host app's documentation for where its MCP config file lives.

## Privacy

Important to understand:

- An AI app connected via MCP can **read your notes**. Whichever model that app uses (Claude, GPT-4, etc.) may include note content in the prompts it sends to its own cloud provider — that's how it answers your question.
- This is independent of Joplin's own [AI chat](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_chat.md) provider. Joplin's chat settings have no effect on what an external AI app does.
- The MCP server only listens on `127.0.0.1`, so other machines on your network can't reach it. The authorisation token guards against other applications on your own machine connecting without your knowledge.
- Turning on the **write** tools allows the AI app to create, modify, or trash notes. Joplin will not ask you to confirm each write — the AI app may or may not. Leave write tools off unless you trust both the app and the model behind it.

To shut the server off, untick **Enable MCP server** or turn off the Web Clipper service.

## Troubleshooting

- **Tools don't appear in the AI app.** Most apps cache the tool list when they start. After flipping a per-tool toggle in Joplin, restart the AI app completely (Cmd+Q on macOS, not just close the window) so it reconnects and refreshes.
- **Connection refused / 403.** Check that the Web Clipper is started and that the MCP toggle is on in Joplin's settings. The token in the URL must exactly match the one shown in Joplin under Web Clipper.
- **Write attempt says the tool isn't available.** The write tool is off in Joplin's settings, or wasn't on when the AI app last connected. Turn it on and restart the AI app.
