#!/usr/bin/env tsx
/**
 * OneDrive 同期 CLI エントリポイント
 *
 * 使い方:
 *   npm run sync_cli -- --profileName joplin_desktop
 *   npm run sync_cli -- --profileName=joplin_desktop_test2
 *
 * profileName は ~/.config/<profileName>/database.sqlite のプロファイルを指す。
 * (Joplin Desktop のデフォルトは "joplin-desktop")
 *
 * コアの同期処理は sync_lib.ts に実装されている。
 */

import * as path from 'path';
import { homedir } from 'os';
import { runSync } from './sync_lib';

// ---------------------------------------------------------------------------
// --profileName 引数をパース
// ---------------------------------------------------------------------------
const cliArgs = process.argv.slice(2);
let profileName: string | null = null;

for (let i = 0; i < cliArgs.length; i++) {
  const arg = cliArgs[i];
  if (arg.startsWith('--profileName=')) {
    profileName = arg.slice('--profileName='.length);
  } else if (arg === '--profileName' && i + 1 < cliArgs.length) {
    profileName = cliArgs[i + 1];
    i++;
  }
}

if (!profileName) {
  console.error('Usage: npm run sync_cli -- --profileName <profileName>');
  console.error('Example: npm run sync_cli -- --profileName joplin-desktop');
  process.exit(1);
}

// パストラバーサル対策
const safeProfile = path.basename(profileName);
const profileDir = path.join(homedir(), '.config', safeProfile);

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------
runSync(profileDir)
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Sync failed:', error);
    process.exit(1);
  });
