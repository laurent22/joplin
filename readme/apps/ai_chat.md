# AI chat

Joplin can connect to a chat model — either a cloud service or one running on your own machine — so that the [AI chat panel](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_chat_panel.md) and plugins can use it to summarise, rewrite, or answer questions about your notes. The model itself is configured in **one place** in the settings. Plugins then use that model without needing their own API keys.

This page covers the underlying configuration. For the chat panel built into the editor, see [AI chat panel](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_chat_panel.md).

## Turning it on

AI is **off by default**. To enable it:

1. Open the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) and go to the **AI** section.
2. Tick **Enable AI features**.
3. Pick a **Chat provider** and fill in its settings.
4. Click **Test AI configuration** to verify it works.

AI features are only available on the desktop app.

## Picking a provider

| Provider | What it is | Setup |
|---|---|---|
| **Joplin Cloud AI** | A chat model hosted by Joplin Cloud. Available to Joplin Cloud users on supported plans. | Zero config — Joplin reuses your sync credentials. Selected automatically the first time you enable AI if you are syncing with Joplin Cloud. |
| **OpenAI-compatible** | Any service that speaks the OpenAI API: OpenAI itself, Ollama, LM Studio, OpenRouter, vLLM, and many others. | Set the base URL (e.g. `https://api.openai.com/v1` or `http://localhost:11434/v1` for Ollama), the API key, and the model name. |
| **Anthropic** | Direct calls to Anthropic's Claude models. | Set your API key and a model id (e.g. `claude-3-5-sonnet-latest`). |

You can change provider at any time.

## Local vs remote: the "Allow remote providers" switch

To protect against accidentally sending your notes to a cloud service, Joplin keeps a second, separate switch: **Allow remote AI providers**. By default it is off.

- **Local providers** (Ollama, LM Studio, or any other server running on `localhost` / `127.0.0.1`) work with this switch off — nothing leaves your computer.
- **Remote providers** (Joplin Cloud AI, Anthropic, OpenAI, anything not on localhost — including services on your local network) need this switch on. If it's off, AI calls to a remote provider fail with a clear error.

LAN addresses are deliberately treated as remote. The idea is "did my data leave this device", not "did it leave my house".

## Token usage

Most chat providers charge per token. To help you keep an eye on usage, Joplin tracks cumulative input and output tokens for the **currently configured provider** and shows them in Settings → AI. There's a **Reset token usage** button next to the counters.

When you change provider or endpoint, the counters reset automatically so you don't mix totals from different services.

## Testing your setup

The **Test AI configuration** button sends a one-message chat ("Reply with the single word OK.") to your active provider and shows the response inline. This is the fastest way to confirm everything works end-to-end — the configuration screen does not validate provider details until you actually call the model.

If the test fails, the error message is shown directly below the button. Common ones:

- *"Joplin Cloud AI requires Joplin Cloud sync"* — you picked Joplin Cloud AI but you're not syncing with Joplin Cloud. Either restore Joplin Cloud sync or pick a different provider.
- *"Remote AI providers are not allowed"* — turn on **Allow remote AI providers**.
- *"No choices in response — check that the base URL includes /v1"* — common for local Ollama / LM Studio servers; the base URL needs the `/v1` suffix.

## Plugins that use AI chat

Plugins can call `joplin.ai.chat()` to ask the model a question. They cannot choose the provider or the model — both come from your settings. That means a plugin written against OpenAI will also work against Ollama or Joplin Cloud AI with no changes.

If a plugin uses AI, you'll see it in the plugin's description. The plugin can read your notes as part of building its prompt, so the usual rules apply: if you're using a remote provider, that note content goes to the provider.

## Disabling AI

Untick **Enable AI features** in Settings → AI. While the master toggle is off, no AI call from any plugin or built-in feature succeeds, regardless of provider settings or the remote-allow switch.
