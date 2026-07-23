# Fork Notes: BAH Joplin

This repository is a fork of Joplin, maintained as a Booz Allen Hamilton branded distribution.

## Scope of Divergence

- Rebrand of user-facing names and metadata to "Booz Allen Notes".
- Platform identifier migration for desktop, Android, iOS, and clipper surfaces.
- Release pipeline namespace migration for fork-owned repositories and Docker images.
- Server/web default URL and copy updates for BAH-operated domains.

## Upstream Attribution and License

- Upstream project attribution is intentionally preserved in git history and retained legal files.
- AGPL licensing and bundled third-party notices remain in place.
- This fork does not remove or rewrite required attribution records.

## Update Policy

- Periodically rebase/merge from upstream Joplin after compatibility review.
- Re-run `yarn verifyRebrand` after every upstream sync to catch identifier regressions.
- Keep this document current when divergence grows beyond branding and namespace changes.
