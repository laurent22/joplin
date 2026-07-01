# Offline Thesaurus Plugin — Integration Architecture

This document covers the Joplin-side integration layer between the TypeScript plugin and the Python NLP pipeline. It does not describe the NLP implementation (WordNet, MiniLM, ranking) — that is a separate concern.

## 1. Joplin Plugin Execution Model

Plugins on desktop run inside an Electron **BrowserWindow** with `nodeIntegration: true` and `contextIsolation: false` (see `packages/app-desktop/services/plugins/PluginRunner.ts`). The webpack config sets `target: 'node'`, meaning all Node.js built-in modules — including `child_process` — are available directly via `require` at runtime without polyfilling.

```
Plugin BrowserWindow (Electron)
 ├── plugin index.js  (sandboxProxy + IPC bootstrap)
 └── dist/index.js    (your webpack bundle, target: node)
       └── can require('child_process'), require('path'), etc.
```

All calls from the plugin to the Joplin host API go through **Electron IPC** (`ipcRenderer ↔ ipcMain`). The sandbox proxy (`packages/lib/services/plugins/sandboxProxy.js`) translates chained property access like `joplin.commands.execute(...)` into IPC messages with a dotted path string.

`joplin.require()` only whitelists `sqlite3`, `fs-extra`, and `7zip-bin`. For everything else, use regular `require()` inside your webpack bundle — it works because `nodeIntegration: true`.

## 2. Architecture Overview

```
Webview / Dialog (HTML)
        │  postMessage / onMessage
        ▼
RankingService        ← TypeScript, lives in plugin src/
        │  method call
        ▼
PythonProcessManager  ← TypeScript, plugin src/
        │  child_process.spawn (stdin/stdout, NDJSON)
        ▼
Python NLP Pipeline   ← separate Python process
        ├── WordNet
        ├── MiniLM
        └── Ranking
```

The frontend (webview or dialog) never calls `PythonProcessManager` directly. `RankingService` is the only public surface.

## 3. Existing Patterns to Reuse

### 3.1 child_process.spawn pattern

`packages/lib/services/ExternalEditWatcher/utils.ts` is the canonical reference for spawning an external process in this codebase:

```typescript
import { spawn, SpawnOptions } from "child_process";

const spawnCommand = async (
  path: string,
  args: string[],
  options: SpawnOptions,
) => {
  return new Promise((resolve, reject) => {
    const subProcess = spawn(path, args, options);

    const iid = shim.setInterval(() => {
      if (subProcess && subProcess.pid) {
        shim.clearInterval(iid);
        resolve(null);
      }
    }, 100);

    subProcess.on("error", (error: Error) => {
      shim.clearInterval(iid);
      reject(wrapError(error));
    });
  });
};
```

Key differences for the thesaurus case:

- Keep the process **alive** (daemon mode) — do not detach it
- Use `stdio: ['pipe', 'pipe', 'pipe']` to get stdin/stdout handles
- Multiplex requests over the long-lived process using a correlation ID

### 3.2 Service + Driver pattern

Follow `packages/lib/services/ai/` exactly:

| AI pattern                      | Thesaurus equivalent                 |
| ------------------------------- | ------------------------------------ |
| `EmbeddingProvider` (interface) | `ThesaurusProvider` (interface)      |
| `LocalEmbeddingProvider` (impl) | `PythonThesaurusProvider` (impl)     |
| `AiService` (singleton wrapper) | `RankingService` (singleton wrapper) |
| `EmbeddingModelDownloader`      | `PythonProcessManager`               |

The `AiService` caches the provider, forwards calls, and handles configuration changes. Do the same in `RankingService`.

### 3.3 Error types

Use `JoplinError` (`packages/lib/JoplinError.ts`) with a plugin-specific error code:

```typescript
import JoplinError from "@joplin/lib/JoplinError";
// within plugin, import from the bundled copy or define locally

throw new JoplinError("Python process not ready", "thesaurusProcessNotReady");
throw new JoplinError("Request timed out", "thesaurusTimeout");
```

Or define a thin local error class following the same `message + code` shape.

### 3.4 Logger

```typescript
import Logger from "@joplin/utils/Logger";
const logger = Logger.create("PythonProcessManager");
```

This is available in the plugin bundle and routes output to the Joplin log file / developer console.

### 3.5 Settings

Use `joplin.settings.register()` to store plugin configuration (Python binary path, timeout, etc.):

```typescript
await joplin.settings.registerSettings({
  pythonPath: {
    value: "python3",
    type: SettingItemType.String,
    section: "thesaurus",
    public: true,
    label: "Python executable path",
  },
  requestTimeoutMs: {
    value: 5000,
    type: SettingItemType.Int,
    section: "thesaurus",
    public: true,
    label: "Request timeout (ms)",
  },
});
```

### 3.6 Frontend ↔ Plugin communication

Use `joplin.views.panels.onMessage` / `panels.postMessage` (or `dialogs`) for the webview↔plugin boundary. See `packages/app-cli/tests/support/plugins/post_messages/src/index.ts` for a working two-way example.

The webview sends a plain object (e.g. `{ type: 'rank', word: 'happy' }`). The plugin's `onMessage` handler calls `RankingService`, awaits the result, and returns it. The webview receives the return value as the resolved promise from `webviewApi.postMessage(...)`.

## 4. TS–Python API Contract (NDJSON over stdio)

Run one long-lived Python process. Multiplex requests using a correlation ID.

### 4.1 Request schema

```typescript
interface RankRequest {
  id: string; // UUID, used to match the response
  word: string; // word to look up
  context?: string; // surrounding sentence (optional, for MiniLM)
  topN?: number; // max synonyms to return, default 10
}
```

Serialised as one JSON line terminated by `\n` written to the process's stdin.

### 4.2 Response schema

```typescript
interface RankResponse {
  id: string; // mirrors the request id
  results: SynonymEntry[];
  error?: string; // set only on failure
}

interface SynonymEntry {
  word: string;
  score: number; // 0–1, higher is more similar
  pos?: string; // part of speech: 'n' | 'v' | 'a' | 'r'
}
```

Serialised as one JSON line terminated by `\n` written to stdout by Python.

### 4.3 Error line

If Python encounters an unrecoverable error it writes:

```json
{ "id": "<req-id>", "results": [], "error": "human readable message" }
```

The TypeScript side must never leave a pending promise without a timeout guard.

## 5. PythonProcessManager Implementation Guide

File: `src/PythonProcessManager.ts` in your plugin

<!-- cSpell:disable -->
```typescript
// Pseudocode — wire up the real types

import { spawn, ChildProcess } from "child_process";

interface PendingRequest {
  resolve: (r: RankResponse) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export default class PythonProcessManager {
  private process_: ChildProcess | null = null;
  private pending_: Map<string, PendingRequest> = new Map();
  private buffer_ = "";

  public async start(pythonBin: string, scriptPath: string): Promise<void> {
    this.process_ = spawn(pythonBin, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process_.stdout.on("data", (chunk: Buffer) => {
      this.buffer_ += chunk.toString("utf8");
      this.flushLines();
    });

    this.process_.stderr.on("data", (chunk: Buffer) => {
      logger.warn("Python stderr:", chunk.toString("utf8"));
    });

    this.process_.on("exit", (code) => {
      logger.error(`Python process exited with code ${code}`);
      this.rejectAll(new Error(`Process exited: ${code}`));
      this.process_ = null;
    });
  }

  public async send(
    req: RankRequest,
    timeoutMs: number,
  ): Promise<RankResponse> {
    if (!this.process_) throw new Error("Process not started");

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending_.delete(req.id);
        reject(new Error(`Thesaurus request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending_.set(req.id, { resolve, reject, timer });
      this.process_.stdin.write(JSON.stringify(req) + "\n", "utf8");
    });
  }

  private flushLines() {
    const lines = this.buffer_.split("\n");
    this.buffer_ = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const resp: RankResponse = JSON.parse(trimmed);
        const pending = this.pending_.get(resp.id);
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pending_.delete(resp.id);
        if (resp.error) {
          pending.reject(new Error(resp.error));
        } else {
          pending.resolve(resp);
        }
      } catch (e) {
        logger.error("Failed to parse Python response line:", trimmed, e);
      }
    }
  }

  private rejectAll(error: Error) {
    for (const [id, pending] of this.pending_) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending_.delete(id);
    }
  }

  public stop() {
    if (this.process_) {
      this.process_.kill();
      this.process_ = null;
    }
  }
}
```
<!-- cSpell:enable -->

## 6. RankingService Implementation Guide

File: `src/RankingService.ts`

<!-- cSpell:disable -->
```typescript
export default class RankingService {
  private static instance_: RankingService;
  private manager_: PythonProcessManager | null = null;

  public static instance(): RankingService {
    if (!this.instance_) this.instance_ = new RankingService();
    return this.instance_;
  }

  public async start(pythonBin: string, scriptPath: string) {
    this.manager_ = new PythonProcessManager();
    await this.manager_.start(pythonBin, scriptPath);
  }

  public async getSynonyms(
    word: string,
    context?: string,
  ): Promise<SynonymEntry[]> {
    if (!this.manager_) throw new Error("RankingService not started");

    const timeoutMs = await joplin.settings.value("requestTimeoutMs");
    const req: RankRequest = { id: uuid(), word, context };
    const resp = await this.manager_.send(req, timeoutMs);
    return resp.results;
  }

  public stop() {
    this.manager_?.stop();
    this.manager_ = null;
  }
}
```
<!-- cSpell:enable -->

Start it in `joplin.plugins.register({ onStart })` and stop it on plugin unload if Joplin exposes that event.

## 7. Where to Focus — File-by-File

| File to study                                                          | Why                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/app-desktop/services/plugins/PluginRunner.ts`                | Understand plugin lifecycle and IPC wiring                                  |
| `packages/lib/services/plugins/sandboxProxy.js`                        | Understand how API calls cross the process boundary                         |
| `packages/lib/services/ExternalEditWatcher/utils.ts`                   | The only `child_process.spawn` reference in the codebase                    |
| `packages/lib/services/ai/AiService.ts`                                | Service singleton pattern to replicate                                      |
| `packages/lib/services/ai/types.ts`                                    | Provider interface pattern to replicate                                     |
| `packages/lib/JoplinError.ts`                                          | Error type to reuse or mirror                                               |
| `packages/app-cli/tests/support/plugins/post_messages/src/index.ts`    | Two-way webview↔plugin messaging                                           |
| `packages/app-cli/tests/support/plugins/nativeModule/src/index.ts`     | `joplin.require()` usage                                                    |
| `packages/app-cli/tests/support/plugins/worker/src/index.ts`           | Worker thread as alternative async pattern                                  |
| `packages/generator-joplin/generators/app/templates/webpack.config.js` | `target: 'node'` + `moduleFallback` — confirms `child_process` is available |
| `readme/dev/spec/plugins.md`                                           | Full plugin architecture reference                                          |

## 8. Potential Pitfalls

**Sandbox proxy call-chain caching.** Never store intermediate references like `const ai = joplin.ai`. The sandbox proxy tracks access chains internally and storing a partial chain corrupts it. Always start from the top-level `joplin` object in a single expression. See `ai_search` plugin comment in `packages/app-cli/tests/support/plugins/ai_search/src/index.ts`.

**`child_process` is not in `joplin.require()`.** It is available via normal `require('child_process')` in your webpack bundle because `target: 'node'` and Electron's `nodeIntegration: true`. Do not try to call it through `joplin.require()`.

**NDJSON buffer fragmentation.** `stdout.on('data')` does not guarantee one line per event. Always accumulate into a string buffer and split on `\n`. The `flushLines` approach above handles this correctly.

**Process restart on crash.** The Python process can crash. `PythonProcessManager` should detect the `exit` event, reject all pending promises, and optionally restart the process. Implement exponential back-off before retrying to avoid restart storms.

**Plugin unload.** Joplin does not currently expose a stable `onUnload` hook on desktop. Register a cleanup via `plugin.onUnload` if/when available, or listen to the `'close'` event on the Joplin window. Until then, the Python process will be killed when the Electron window closes anyway.

**Timeout correlation.** Always pair every request with a `setTimeout` guard. If the Python process hangs, without a timeout the `getSynonyms()` call will never resolve, freezing the webview.

**Windows path separators.** When resolving the Python script path inside the plugin, use `path.join(await joplin.plugins.installationDir(), 'nlp', 'server.py')`. The `installationDir()` call gives the plugin's base directory cross-platform.

**CLI runner.** On the CLI, plugins run inside the `vm` module (same process), not an Electron BrowserWindow. `child_process` is still available since Node.js provides it, but the plugin will not be sandboxed. This is acceptable for a desktop-targeted plugin; add `"platforms": ["desktop"]` in `manifest.json`.

## 9. Ticket Checklist

| Ticket                                      | Approach                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Define TS–Python API Contract               | Use the NDJSON schemas in §4.                                                                   |
| Define Ranking Request and Response Schemas | `RankRequest`, `RankResponse`, `SynonymEntry` from §4. Keep in `src/types.ts`.                  |
| Implement Python Process Manager            | Follow `PythonProcessManager` skeleton in §5. Model lifecycle after `EmbeddingModelDownloader`. |
| Create Ranking Service Wrapper              | Follow `RankingService` skeleton in §6. Model API surface after `AiService`.                    |
| Implement Python Error and Timeout Handling | `rejectAll` on process exit, `setTimeout` per-request, `stderr` logging. See §5 and §8.         |
