# Rebrand Identity Guard

Phase 1 introduces a lightweight guard to prevent new legacy identifiers from being added to ship-critical files by accident.

## Command

- `yarn checkRebrandIdentity`

This command scans added lines from `git diff` in ship-critical paths and fails if they contain blocked legacy identifiers (for example `net.cozic`, `joplinapp.org`, or `laurent22/joplin`).

## Intentional Exceptions

- Edit `readme/dev/rebrand_identity_guard_exceptions.json`.
- Add only file paths that must intentionally include legacy terms (for example migration docs or attribution references).
- Keep the list short and remove entries when no longer needed.

## Matrix Update Rule

- Update `readme/rebrand_identity_matrix.md` before implementation PRs change runtime identifiers.
- If matrix values change, update this guard's block patterns or exceptions in the same PR when needed.
