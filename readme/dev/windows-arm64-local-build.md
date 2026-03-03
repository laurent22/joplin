# Windows ARM64 local build (session-only)

This workflow is designed to avoid changing global machine configuration.

## What it does

- Uses a Visual Studio Developer Shell for the current terminal session.
- Adds Rust and Node tools to `PATH` only for the current terminal session.
- Sets `node-gyp` Visual Studio selection only for the current terminal session.
- Sets `SKIP_ONENOTE_CONVERTER_BUILD=1` during install to avoid requiring `wasm-pack` on unsupported ARM64 environments.
- When `-ForceSourceBuild` is set, sets `npm_config_build_from_source=true` and `npm_config_fallback_to_build=true` during install so native modules (notably `sqlite3`) compile locally when no prebuilt binary exists.
- Uses the standard desktop build CLI (`yarn dist --win --<arch>`) for both ARM64 and x64.
- Supports ARM64 or x64 build target selection.

## Files

- `.github/scripts/dev-shell-win-arm64.ps1`
- `.github/scripts/build-clean-win-arm64.ps1`
- `.github/scripts/install-audit-win-arm64.ps1`
- `.github/scripts/build-onenote-win-arm64-local.ps1`
- `.github/scripts/build-sqlite3-win-arm64-local.ps1`

`dev-shell-win-arm64.ps1` also supports `-Quiet` to suppress session setup logs.

## Usage

From repository root (`D:/projects/joplin`):

```powershell
# Configure this terminal only (no global changes)
.\.github\scripts\dev-shell-win-arm64.ps1 -Arch arm64 -HostArch arm64 -MsvsVersion 2022 -SetLocationToRepo

# Install dependencies and run Windows ARM64 dist build (no publish)
.\.github\scripts\build-clean-win-arm64.ps1 -TargetArch arm64
```

For x64 on the same machine:

```powershell
.\.github\scripts\build-clean-win-arm64.ps1 -TargetArch x64
```

## Optional flags

`build-clean-win-arm64.ps1` supports:

- `-Clean` to run `git clean -xfd` before install
- `-Publish` to allow publishing during `yarn dist`
- `-SkipInstall` to skip `yarn install`
- `-SkipBuildScriptsInstall` to run `yarn install --mode=skip-build` (installs dependencies without native postinstall/build steps)
- `-ForceSourceBuild` to force native module source compilation during install
- `-SkipDist` to only prepare the session/install
- `-MsvsVersion 2022` to choose Visual Studio version for `node-gyp`

Recommended for a non-invasive local setup on Windows ARM64:

```powershell
.\.github\scripts\build-clean-win-arm64.ps1 -TargetArch arm64 -SkipBuildScriptsInstall -SkipDist
```

To install dependencies (without running native build scripts) and print dependency chains for native blockers:

```powershell
.\.github\scripts\install-audit-win-arm64.ps1 -TargetArch arm64
```

For CI/log parsing, output a single JSON document:

```powershell
.\.github\scripts\install-audit-win-arm64.ps1 -TargetArch arm64 -JsonOutput
```

To compile the OneNote converter blocker in a session-only way (repo-local `wasm-pack`, no global PATH changes):

```powershell
.\.github\scripts\build-onenote-win-arm64-local.ps1 -TargetArch arm64
```

`packages/onenote-converter/tools/build.js` now supports `WASM_PACK_BIN` to force a specific `wasm-pack` executable path (used by the script above).

Optional flags for `build-onenote-win-arm64-local.ps1`:

- `-ForceWasmPackInstall` to reinstall local `wasm-pack`
- `-SkipInstall` to skip `yarn install --mode=skip-build`
- `-Release` to build release profile (sets `IS_CONTINUOUS_INTEGRATION=1` in-session)

To compile the sqlite3 blocker for desktop in a session-only way:

```powershell
.\.github\scripts\build-sqlite3-win-arm64-local.ps1 -TargetArch arm64
```

This script applies local compatibility workarounds for Visual Studio 18 + `node-gyp` and for the generated sqlite3 MSBuild action command, then builds `node_sqlite3.node` for `napi-v6-win32-unknown-arm64`.

## Notes

Current known blockers on native Windows ARM64 in this repo are third-party dependencies (`wasm-pack` and `sqlite3` toolchain compatibility). These scripts keep setup reproducible while those upstream issues are handled.
