# AI chat

How Joplin exposes a generic chat-with-an-LLM capability to plugins and built-in features. This is the concrete implementation of the **provider abstraction** and **privacy & cost guardrails** primitives — see [ai_primitives.md](ai_primitives.md) for how it fits with the rest.

The goal is not to ship a built-in chat UI — that is left to plugins. The goal is to provide one stable API (`joplin.ai.chat()`) that lets any plugin call a chat model without bundling provider code or asking the user for a second set of API keys.

## Plugin API

A new `joplin.ai` namespace exposes a single method:

```typescript
joplin.ai.chat(
    messages: ChatMessage[],
    options?: ChatOptions,
): Promise<string>;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
}
```

The method returns the assistant's text response as a string. The active provider and model are picked by the user in Joplin's settings — plugins **do not** specify them. This is the contract that lets users swap from, say, OpenAI to a self-hosted Ollama instance without any plugin changing its code.

Plugins do not pass provider-specific options (e.g. Anthropic's `thinking`, OpenAI's `tool_use`). The lowest common denominator across providers is the v1 API surface..

## Provider abstraction

Three provider adapters ship with the desktop app:

- **OpenAI-compatible** — covers OpenAI itself, Ollama, LM Studio, OpenRouter, vLLM, and any other server speaking the OpenAI chat completions protocol. The base URL is user-configured.
- **Anthropic** — direct calls to the Anthropic Messages API.
- **Joplin Cloud AI** — calls `POST /api/ai/chat/completions` on Joplin Cloud, using the existing sync session for authentication.

Each adapter implements a common `ChatProvider` interface internally:

```typescript
interface ChatProvider {
    id: string;
    classification: 'local' | 'remote';
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}
```

The shared `AiService` is the single funnel. Plugin calls (via `joplin.ai.chat()`) and the in-settings test button both route through `AiService.chat()`, which enforces the privacy gate before delegating to the active provider.

## Settings model

Settings live in the `ai` section of `builtInMetadata.ts`. They are all marked as desktop-only.

| Setting | Default | Purpose |
|---|---|---|
| `ai.enabled` | `false` | Master switch. AI is off by default. |
| `ai.allowRemote` | `false` | Explicit opt-in for `remote`-classified providers. |
| `ai.chat.providerType` | `'openai-compatible'` | Active provider. Visible in the UI as a dropdown. |
| `ai.chat.providerType.configured` | `false` | Hidden flag. Tracks whether the user has made an explicit provider choice. See [First-enable default](#first-enable-default) below. |
| `ai.chat.baseUrl` | `''` | OpenAI-compatible only. Must include `/v1` suffix. |
| `ai.chat.apiKey` | `''` | OpenAI-compatible and Anthropic. Marked `secure`, stored in the OS keychain. |
| `ai.chat.model` | `''` | OpenAI-compatible and Anthropic. The model identifier (e.g. `gpt-4o-mini`, `claude-3-5-sonnet-latest`). |
| `ai.usage.inputTokens` / `outputTokens` | `0` | Cumulative usage counters for the currently configured provider. |

The `baseUrl`, `apiKey`, and `model` fields are hidden via `show()` conditionals when the active provider doesn't use them (e.g. Joplin Cloud AI hides all three).

## Privacy gate

Two layers protect the user from inadvertently sending notes off-device.

The first is the master `ai.enabled` toggle. Until it is on, no AI call from any source (plugin or built-in) succeeds.

The second is `ai.allowRemote`. Providers are classified as either `local` or `remote`:

- Anthropic and Joplin Cloud AI are always `remote`.
- OpenAI-compatible is `local` when its base URL points at `localhost` / `127.0.0.1` / `::1`, and `remote` otherwise. LAN addresses are deliberately classified as remote — the contract is "does my data leave my network", and LAN traffic does.

A remote-classified provider call throws unless `ai.allowRemote` is also on. The user must therefore toggle two switches before any cloud provider is reachable.

## First-enable default

The spec primitive calls out Joplin Cloud as a zero-config path for users who already trust Joplin Cloud with their notes. To deliver that without surprising users on other sync targets, the first time `ai.enabled` flips from `false` to `true`:

- If the user is currently syncing with Joplin Cloud (`sync.target === 10`), `ai.chat.providerType` is set to `'joplin-cloud'`.
- Otherwise the providerType stays at its metadata default (`'openai-compatible'`).
- In both cases, `ai.chat.providerType.configured` is then set to `true`.

After this single one-shot write, sync target changes do not affect the AI provider. A user who set up AI on Joplin Cloud and later switches to Dropbox keeps Joplin Cloud AI as their provider (with an inline warning in the AI settings that the provider will fail until they restore Cloud sync or pick a different one).

## Token-usage tracking

Two counters per profile, `ai.usage.inputTokens` and `ai.usage.outputTokens`, track cumulative usage **for the currently configured provider**. They are reset to zero whenever the user changes the active provider endpoint (provider type or base URL change) — this avoids mixing totals across distinct services routed through the same adapter (e.g. OpenAI and Mistral both via the OpenAI-compatible adapter).

The counters are displayed under a "Reset token usage" button in Settings → AI. The button's description shows the current counter values; clicking it asks for confirmation and zeroes them.

## Test button

Settings → AI includes a "Test AI configuration" button. When clicked:

1. Pending edits in the form are flushed to settings (so the test runs against what the user just entered, not the previously-saved values).
2. A one-message chat (`Reply with the single word OK.`) is sent to the active provider via `AiService.chat()`.
3. The result is rendered inline below the button:
   - On success, the model's response is shown.
   - On error, the full error message is shown in the warning colour. The full error is also logged to the dev tools console for debugging.

The test button reuses the same code path as plugin calls (`AiService.chat()`), so it validates the privacy gate, the provider construction, the network call, and the response parsing in a single click.

## Joplin Cloud AI specifics

The Joplin Cloud AI adapter is structurally different from the other OpenAI-compatible providers and worth calling out:

- **Authentication**: it reuses the existing Joplin Server session from the active sync configuration. There is no separate API key for the user to manage, and no separate credential storage.
- **Endpoint**: `POST {sync.10.path}/api/ai/chat/completions`.
- **Model selection**: the request body omits `model` deliberately — Joplin Cloud picks the model based on the user's account type and remaining token budget. A client-supplied model is ignored server-side.
- **Response envelope**: in addition to the OpenAI-compatible `choices` and `usage` fields, the server returns a `joplin` envelope (`{ degraded, tokens_used, tokens_budget }`). The `degraded` flag is logged client-side but not surfaced to plugins in v1.
- **Error mapping**: server status codes are translated into actionable messages (e.g. 429 → *"Joplin Cloud AI rate limit or token budget exceeded"*, 501 → *"Joplin Cloud AI is not enabled on this server"*).
- **Sync target check**: each call verifies `sync.target === 10` before issuing the request, so a user who configured `joplin-cloud` and then switched sync targets gets a clear *"Joplin Cloud AI requires Joplin Cloud sync"* error rather than a network failure.

## Failure cases worth knowing

A few non-obvious failure modes documented for future contributors:

- **Base URL without `/v1` on OpenAI-compatible servers.** Most local servers (LM Studio, Ollama) respond `200` with an empty body when a `POST /chat/completions` request misses the `/v1` prefix. The adapter detects a 2xx response with no `choices` array and surfaces a clear error directing the user to fix the URL.
- **Token counts missing from OpenAI-compatible responses.** Older Ollama versions omit the `usage` block entirely. The adapter defaults missing counts to zero rather than throwing.
- **Provider misconfiguration discovered only at call time.** Joplin's settings system has no concept of "save validation that calls the network". The test button is the user-facing mechanism for confirming the configuration is end-to-end correct.
