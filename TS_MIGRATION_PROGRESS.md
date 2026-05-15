# TypeScript Migration Progress - @joplin/lib

## Summary

- **Total JS files (packages/lib)**: 57 (initially)
- **Migrated files**: 25
- **Pending files**: 32

## Migration Log

### Session 6 (2026-05-15)
- **Batch 6**: Migration of ENEX HTML generation and utility modules.
- **Files Migrated**:
    - [x] `packages/lib/import-enex-html-gen.js` → `packages/lib/import-enex-html-gen.ts`
    - [x] `packages/lib/react-logger.js` → `packages/lib/react-logger.ts`
    - [x] `packages/lib/fs-driver-dummy.js` → `packages/lib/fs-driver-dummy.ts`
    - [x] `packages/lib/mime-utils-types.js` → `packages/lib/mime-utils-types.ts`
- **Key Typing Improvements**:
    - Added `MimeType` interface for mime-utils-types.
    - Improved types for SAX stream handling in ENEX HTML generation.

### Session 5 (2026-05-15)
- **Batch 5**: Migration of Amazon S3 and OneDrive drivers and utilities.
- **Files Migrated**:
    - [x] `packages/lib/file-api-driver-amazon-s3.js` → `packages/lib/file-api-driver-amazon-s3.ts`
    - [x] `packages/lib/SyncTargetAmazonS3.js` → `packages/lib/SyncTargetAmazonS3.ts`
    - [x] `packages/lib/file-api-driver-onedrive.js` → `packages/lib/file-api-driver-onedrive.ts`
    - [x] `packages/lib/onedrive-api-node-utils.js` → `packages/lib/onedrive-api-node-utils.ts`
- **Key Typing Improvements**:
    - Refactored `OneDriveApiNodeUtils.ts` to use async/await for OAuth logic.
    - Improved types for S3 driver using AWS SDK commands.
- **Infrastructure Changes**:
    - Updated `app-cli` and `app-desktop` to support the new TypeScript default export for `OneDriveApiNodeUtils`.

### Session 4 (2026-05-15)
- **Batch 4**: Migration of Dropbox and WebDAV drivers, and Memory/Nextcloud/WebDAV sync targets.
- **Files Migrated**:
    - [x] `packages/lib/file-api-driver-dropbox.js` -> `packages/lib/file-api-driver-dropbox.ts`
    - [x] `packages/lib/file-api-driver-webdav.js` -> `packages/lib/file-api-driver-webdav.ts`
    - [x] `packages/lib/SyncTargetMemory.js` -> `packages/lib/SyncTargetMemory.ts`
    - [x] `packages/lib/SyncTargetNextcloud.js` -> `packages/lib/SyncTargetNextcloud.ts`
    - [x] `packages/lib/SyncTargetWebDAV.js` -> `packages/lib/SyncTargetWebDAV.ts`
- **Key Typing Improvements**:
    - Leveraged existing `WebDavApi.ts` types in `FileApiDriverWebDav.ts`.
    - Improved internal types for Dropbox driver.
- **Infrastructure Changes**:
    - Updated `testing/test-utils.ts` to support ES module imports for newly migrated sync targets and drivers.

### Session 3 (2026-05-15)
- **Batch 3**: Migration of Dropbox API, Sync Target, and Database Driver.
- **Files Migrated**:
    - [x] `packages/lib/reserved-ids.js` -> `packages/lib/reserved-ids.ts`
    - [x] `packages/lib/DropboxApi.js` -> `packages/lib/DropboxApi.ts`
    - [x] `packages/lib/SyncTargetDropbox.js` -> `packages/lib/SyncTargetDropbox.ts`
    - [x] `packages/lib/database-driver-node.js` -> `packages/lib/database-driver-node.ts`
- **Key Typing Improvements**:
    - Added `DropboxOptions` and `DropboxExecOptions` in `DropboxApi.ts`.
    - Improved types for `DatabaseDriverNode`.
- **Infrastructure Changes**:
    - Updated `testing/test-utils.ts` to support ES module imports (.default) for newly migrated sync targets and drivers.

### Session 2 (2026-05-15)
- **Batch 2**: Migration of more utility files and locale data.
- **Files Migrated**:
    - [x] `packages/lib/envFromArgs.js` -> `packages/lib/envFromArgs.ts`
    - [x] `packages/lib/markJsUtils.js` -> `packages/lib/markJsUtils.ts`
    - [x] `packages/lib/randomClipperPort.js` -> `packages/lib/randomClipperPort.ts`
    - [x] `packages/lib/parseUri.js` -> `packages/lib/parseUri.ts`
    - [x] `packages/lib/locales/index.js` -> `packages/lib/locales/index.ts`
- **Key Typing Improvements**:
    - Added `ClipperState` interface in `randomClipperPort.ts`.
    - Added `Keyword` and `MarkOptions` interfaces in `markJsUtils.ts`.
    - Added `ParseUriOptions` and `Uri` interfaces in `parseUri.ts`.
- **Temporary Workarounds**:
    - `packages/lib/locales/index.ts`: Added `@ts-nocheck` and `/* eslint-disable */` as this file contains complex auto-generated pluralization logic.
    - `packages/lib/markJsUtils.ts`: Used `any` for DOM-related types to ensure compatibility across different environments (Node.js/Browser).

### Session 1 (2026-05-15)
- **Batch 1**: Initial setup and migration of utility files.
- **Files Migrated**:
    - [x] `packages/lib/Cache.js` -> `packages/lib/Cache.ts`
    - [x] `packages/lib/resourceUtils.js` -> `packages/lib/resourceUtils.ts`
    - [x] `packages/lib/parameters.js` -> `packages/lib/parameters.ts`
- **Key Typing Improvements**:
    - Added interfaces for `ElementProps` in `resourceUtils.ts`.
    - Added interfaces for `Parameters` and `ParameterGroup` in `parameters.ts`.
    - Added basic types for `Cache` methods.
- **Temporary `any` usage**:
    - `packages/lib/Cache.ts`: Used `any` for `node-persist` storage object and cached items as specific types were not available.

## Blocked Files / Issues
- `packages/lib/string-utils-common.js`: Marked as "Leave this file as JavaScript" due to browser compatibility concerns in the current TS config.

## Follow-up Tasks
- [ ] Investigate if `string-utils-common.js` can be safely migrated.
- [ ] Remove `any` from migrated files (if introduced).
