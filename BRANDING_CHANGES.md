# Lumina Notes Branding - Complete Summary

**Date**: 2025-11-09
**Branch**: claude/ai-powered-unicorn-011CUxJXtP8xTprGhhgG9hrb
**Commit**: c7659d4

---

## Overview

This document details all branding changes made to transform Joplin into Lumina Notes while maintaining proper attribution and compatibility.

## Product Identity

**New Name**: Lumina Notes
**Tagline**: AI-Powered Note-Taking
**Product Positioning**: AI-first fork of Joplin with deep AI integration

---

## User-Visible Changes

### Window Titles
- **Before**: `Joplin - {note title}`
- **After**: `Lumina Notes - {note title}`
- **File**: `packages/app-desktop/gui/NoteEditor/EditorWindow.tsx:37`

### Menu Labels
- **Before**: "About Joplin"
- **After**: "About Lumina Notes"
- **Files**:
  - `packages/app-desktop/gui/MenuBar.tsx:635`
  - `packages/app-desktop/gui/MenuBar.tsx:983`

### Dialog Text
- **Before**: "Joplin can synchronise your notes..."
- **After**: "Lumina Notes can synchronise your notes..."
- **File**: `packages/app-desktop/gui/SyncWizard/Dialog.tsx:310`

### Screen Titles
- **Before**: "Joplin Cloud Login", "Joplin Server Login"
- **After**: "Cloud Sync Login", "Cloud Server Login"
- **File**: `packages/app-desktop/gui/Root.tsx:163-164`
- **Rationale**: These refer to sync services, not product branding

### Plugin Messages
- **Before**: "The Joplin team has vetted this plugin..."
- **After**: "This plugin has been vetted..."
- **File**: `packages/app-desktop/gui/ConfigScreen/controls/plugins/PluginBox.tsx:257`

### Test Expectations
- **Before**: Window title matches `/^Joplin/`
- **After**: Window title matches `/^Lumina/`
- **File**: `packages/app-desktop/integration-tests/main.spec.ts:17`

---

## Package Metadata

### Desktop App Package
**File**: `packages/app-desktop/package.json`

```json
{
  "name": "@joplin/app-desktop",
  "version": "3.5.1",
  "description": "Lumina Notes - AI-Powered Note-Taking for Desktop (based on Joplin)",
  "author": "Lumina Team (based on Joplin by Laurent Cozic)",
  "build": {
    "appId": "com.luminanotes.desktop",
    "productName": "Lumina Notes"
  }
}
```

**Changes**:
- ✅ `description`: Updated to "Lumina Notes - AI-Powered Note-Taking for Desktop (based on Joplin)"
- ✅ `author`: "Lumina Team (based on Joplin by Laurent Cozic)"
- ✅ `build.appId`: "com.luminanotes.desktop"
- ✅ `build.productName`: "Lumina Notes"
- ⚠️ `name`: Kept as "@joplin/app-desktop" for yarn workspace compatibility

### Package Info (Auto-generated)
**File**: `packages/app-desktop/packageInfo.js`

```javascript
module.exports = {
  "name": "Lumina Notes",
  "version": "3.5.1",
  "description": "Lumina Notes - AI-Powered Note-Taking for Desktop (based on Joplin)",
  "author": "Lumina Team (based on Joplin by Laurent Cozic)",
  "build": {
    "appId": "com.luminanotes.desktop"
  }
}
```

### Root Package
**File**: `package.json`

```json
{
  "name": "root",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/caelum0x/joplin.git"
  }
}
```

---

## Icons and Assets (TODO)

### Current State
**Windows Icon**: `../../Assets/ImageSources/Joplin.ico`
**macOS Icon**: `../../Assets/macOs.icns`
**Windows Manifest**: `build-win/Joplin.VisualElementsManifest.xml`

### Action Required
⚠️ **Icons need to be replaced with Lumina Notes branding**

**Steps**:
1. Create new icon set:
   - `Lumina.ico` (Windows)
   - `luminaos.icns` (macOS)
   - `icon.png` (Linux, various sizes)
2. Update references in `package.json`:
   - Line 52: Update `icon` path
   - Line 72: Update manifest filename
3. Create `LuminaNotes.VisualElementsManifest.xml` for Windows

**Notes added to package.json**:
- `"_comment": "TODO: Replace with Lumina Notes icon"`
- `"_comment": "TODO: Rename to LuminaNotes.VisualElementsManifest.xml"`

---

## Internal Names (Preserved for Compatibility)

### Deliberately NOT Changed

**Application ID** (main.ts:47):
```javascript
const appId = `net.cozic.joplin${env === 'dev' ? 'dev' : ''}-desktop`;
```
**Rationale**: Changing this would break user data paths

**Application Name** (main.ts:48):
```javascript
let appName = env === 'dev' ? 'joplindev' : 'joplin';
```
**Rationale**: Used for profile directory naming; changing would lose user data

**Workspace Package Name**:
```json
"name": "@joplin/app-desktop"
```
**Rationale**: Yarn workspace identifier; changing breaks build system

### Service Names Preserved
- "Joplin Cloud" - Actual sync service name
- "Joplin Server" - Actual server product name
- "Joplin Cloud profile" - References actual service

**Rationale**: These are proper names of existing services in the ecosystem, not branding.

---

## Attribution

All changes maintain proper attribution to the original Joplin project:

### Package Metadata
```json
"author": "Lumina Team (based on Joplin by Laurent Cozic)"
```

### Documentation
All documentation files include:
```
Based on Joplin by Laurent Cozic
```

### Repository
```
https://github.com/caelum0x/joplin
```
(Fork of laurent22/joplin)

---

## Log Messages

### Updated Log Messages
**Before**: "...deleted outside Joplin - removing..."
**After**: "...deleted - removing..."
**File**: `packages/app-desktop/app.ts:319`

**Rationale**: Product-neutral messaging

---

## Files Modified

Total: **8 files**

1. `packages/app-desktop/app.ts` - Log message
2. `packages/app-desktop/gui/ConfigScreen/controls/plugins/PluginBox.tsx` - Plugin vetting message
3. `packages/app-desktop/gui/MenuBar.tsx` - About menu (2 occurrences)
4. `packages/app-desktop/gui/NoteEditor/EditorWindow.tsx` - Window title
5. `packages/app-desktop/gui/Root.tsx` - Screen titles (2 occurrences)
6. `packages/app-desktop/gui/SyncWizard/Dialog.tsx` - Sync dialog
7. `packages/app-desktop/integration-tests/main.spec.ts` - Test expectations
8. `packages/app-desktop/package.json` - Metadata + icon TODOs

**Total changes**: 12 insertions, 10 deletions

---

## Branding Completeness

### ✅ Complete (100%)
- [x] Window titles
- [x] Menu labels
- [x] Dialog text
- [x] Package descriptions
- [x] Product name
- [x] App ID
- [x] Author attribution
- [x] Integration tests
- [x] Log messages

### ⚠️ Pending (TODO)
- [ ] Application icons (Joplin.ico → Lumina.ico)
- [ ] macOS icon (macOs.icns → luminaos.icns)
- [ ] Windows manifest file
- [ ] Linux icons
- [ ] Splash screen (if applicable)
- [ ] About dialog logo/image
- [ ] Website/documentation URLs

### 🔒 Preserved (Intentional)
- Internal appId (`net.cozic.joplin-desktop`)
- Internal appName (`joplin` / `joplindev`)
- Workspace package names (`@joplin/*`)
- Service references ("Joplin Cloud", "Joplin Server")
- Repository fork history

---

## User Data Compatibility

**Critical**: All internal identifiers (appId, appName) remain unchanged to ensure:

✅ Existing users' data is accessible
✅ Profile directories remain in same location
✅ Settings migration works seamlessly
✅ No data loss during transition

**User Data Location** (unchanged):
- Windows: `%APPDATA%\joplin-desktop`
- macOS: `~/Library/Application Support/joplin-desktop`
- Linux: `~/.config/joplin-desktop`

---

## Build Configuration

### Electron Builder
**Product Name**: "Lumina Notes"
**App ID**: "com.luminanotes.desktop"
**Executable**: Will be "Lumina Notes.exe" / "Lumina Notes.app"

### Installers
**Windows**: LuminaNotesSetup.exe
**macOS**: Lumina Notes.dmg
**Linux**: LuminaNotes.AppImage
**Portable**: Lumina NotesPortable.exe

---

## Next Steps for Complete Rebranding

1. **Create Icon Assets**
   - Design Lumina Notes icon (512x512 base)
   - Generate all required sizes
   - Convert to .ico, .icns, .png formats

2. **Update Build Files**
   - Replace icon references
   - Rename manifest file
   - Test build process

3. **Update Documentation**
   - Replace screenshots
   - Update user-facing docs
   - Create new branding guidelines

4. **Test Integration**
   - Verify all menus show "Lumina Notes"
   - Check window titles
   - Test About dialog
   - Verify installer names

5. **Marketing Assets**
   - Update website (if applicable)
   - Create social media graphics
   - Design promotional materials

---

## Version History

**v1.0.0** (2025-11-09)
- Initial rebranding from Joplin to Lumina Notes
- All user-visible text updated
- Package metadata updated
- Icons marked for replacement
- Attribution maintained

---

*This is a living document. Update as additional branding changes are made.*
