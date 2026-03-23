#!/usr/bin/env tsx
/**
 * OneDrive 同期 CLI スクリプト
 *
 * 使い方:
 *   npm run sync_cli -- --profileName joplin_desktop
 *   npm run sync_cli -- --profileName=joplin_desktop_test2
 *
 * profileName は ~/.config/<profileName>/database.sqlite のプロファイルを指す。
 * (Joplin Desktop のデフォルトは "joplin-desktop")
 *
 * 既存の Joplin ライブラリ (@joplin/lib) を最大限再利用しており、
 * OneDrive 認証情報は対象プロファイルの database.sqlite 内の設定に依存する。
 */

import * as path from 'path';
import { homedir } from 'os';

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
// @joplin/lib のモジュールを require で読み込む（CommonJS）
// ---------------------------------------------------------------------------

const Logger = require('@joplin/lib/Logger').default;
const { TargetType } = require('@joplin/lib/Logger');
const Setting = require('@joplin/lib/models/Setting').default;
const JoplinDatabase = require('@joplin/lib/JoplinDatabase').default;
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
const BaseModel = require('@joplin/lib/BaseModel').default;
const BaseItem = require('@joplin/lib/models/BaseItem').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;
const Resource = require('@joplin/lib/models/Resource').default;
const Tag = require('@joplin/lib/models/Tag').default;
const NoteTag = require('@joplin/lib/models/NoteTag').default;
const MasterKey = require('@joplin/lib/models/MasterKey').default;
const Revision = require('@joplin/lib/models/Revision').default;
const EncryptionService = require('@joplin/lib/services/EncryptionService').default;
const { FileApiDriverLocal } = require('@joplin/lib/file-api-driver-local.js');
const FsDriverNode = require('@joplin/lib/fs-driver-node').default;
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const shim = require('@joplin/lib/shim').default;
const SyncTargetRegistry = require('@joplin/lib/SyncTargetRegistry.js');
const SyncTargetOneDrive = require('@joplin/lib/SyncTargetOneDrive').default;
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox');
const SyncTargetFilesystem = require('@joplin/lib/SyncTargetFilesystem');
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud');
const SyncTargetWebDAV = require('@joplin/lib/SyncTargetWebDAV');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3');
const SyncTargetJoplinServer = require('@joplin/lib/SyncTargetJoplinServer').default;
const { reg } = require('@joplin/lib/registry.js');
const KeychainService = require('@joplin/lib/services/keychain/KeychainService').default;
const KeychainServiceDriver =
  require('@joplin/lib/services/keychain/KeychainServiceDriver.node').default;
const KvStore = require('@joplin/lib/services/KvStore').default;
const uuid = require('@joplin/lib/uuid').default;
const fs = require('fs-extra');

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
async function main() {
  // --- 1. FsDriver のセットアップ（shimInit より前に必要）---
  const fsDriver = new FsDriverNode();
  Logger.fsDriver_ = fsDriver;
  Resource.fsDriver_ = fsDriver;
  EncryptionService.fsDriver_ = fsDriver;
  FileApiDriverLocal.fsDriver_ = fsDriver;

  // --- 2. BaseItem サブクラスの登録 ---
  BaseItem.loadClass('Note', Note);
  BaseItem.loadClass('Folder', Folder);
  BaseItem.loadClass('Resource', Resource);
  BaseItem.loadClass('Tag', Tag);
  BaseItem.loadClass('NoteTag', NoteTag);
  BaseItem.loadClass('MasterKey', MasterKey);
  BaseItem.loadClass('Revision', Revision);

  // --- 3. Setting 定数のセット ---
  Setting.setConstant('appId', 'net.cozic.joplin-cli');
  Setting.setConstant('appType', 'cli');
  Setting.setConstant('env', 'prod');
  Setting.setConstant('profileDir', profileDir);
  Setting.setConstant('resourceDirName', 'resources');
  Setting.setConstant('resourceDir', path.join(profileDir, 'resources'));
  Setting.setConstant('tempDir', path.join(profileDir, 'tmp'));
  Setting.setConstant('cacheDir', path.join(profileDir, 'cache'));
  Setting.setConstant('pluginDataDir', path.join(profileDir, 'plugin-data'));
  Setting.setConstant('pluginDir', path.join(profileDir, 'plugins'));
  Setting.setConstant('templateDir', path.join(profileDir, 'templates'));

  // --- 4. 全 SyncTarget を SyncTargetRegistry に登録（Setting.metadata が全ターゲット名を参照するため）---
  SyncTargetRegistry.addClass(SyncTargetOneDrive);
  SyncTargetRegistry.addClass(SyncTargetDropbox);
  SyncTargetRegistry.addClass(SyncTargetFilesystem);
  SyncTargetRegistry.addClass(SyncTargetNextcloud);
  SyncTargetRegistry.addClass(SyncTargetWebDAV);
  SyncTargetRegistry.addClass(SyncTargetAmazonS3);
  SyncTargetRegistry.addClass(SyncTargetJoplinServer);

  // --- 5. 必要なディレクトリを確保 ---
  await fs.mkdirp(profileDir, 0o755);
  await fs.mkdirp(path.join(profileDir, 'resources'), 0o755);
  await fs.mkdirp(path.join(profileDir, 'tmp'), 0o755);
  await fs.mkdirp(path.join(profileDir, 'cache'), 0o755);

  // --- 6. ロガーの初期化 ---
  const globalLogger = new Logger();
  globalLogger.addTarget(TargetType.Console);
  globalLogger.setLevel(Logger.LEVEL_INFO);
  Logger.initializeGlobalLogger(globalLogger);
  reg.setLogger(Logger.create('') as unknown);

  // --- 7. shim の初期化（HTTP/fetch などを有効化）---
  let keytar: unknown = null;
  try {
    keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
  } catch (_e) {
    // keytar が利用できない場合はスキップ
  }
  let sharp: unknown = null;
  try {
    sharp = require('sharp');
  } catch (_e) {
    // sharp は画像処理用。同期には必須ではないためスキップ可
  }
  shimInit(sharp, keytar, null, () => '0.0.1');

  // --- 8. データベースを開く ---
  const dbPath = path.join(profileDir, 'database.sqlite');
  console.log(`Opening database: ${dbPath}`);

  const db = new JoplinDatabase(new DatabaseDriverNode());
  db.setLogger(globalLogger);
  await db.open({ name: dbPath });

  reg.setDb(db);
  BaseModel.setDb(db);
  // tsx がソース .ts ファイルを直接ロードする場合、Setting.ts→BaseModel.ts が
  // BaseModel.js とは別のモジュールインスタンスになり db_ が共有されないため、
  // 各モデルクラスにも明示的に setDb を呼ぶ。
  Setting.setDb(db);
  Note.setDb(db);
  Folder.setDb(db);
  Resource.setDb(db);
  Tag.setDb(db);
  NoteTag.setDb(db);
  MasterKey.setDb(db);
  Revision.setDb(db);
  KvStore.instance().setDb(db);

  // --- 9. キーチェーン＆設定の読み込み（sync.target, 認証情報などを DB から復元）---
  // loadKeychainServiceAndSettings をインライン化。
  // SettingUtils.js 内部の Setting が別モジュールインスタンスになる問題を回避する。
  const clientIdSetting = await Setting.loadOne('clientId');
  const clientId = clientIdSetting ? clientIdSetting.value : uuid.create();
  KeychainService.instance().initialize(
    new KeychainServiceDriver(Setting.value('appId'), clientId)
  );
  KeychainService.instance().setLogger(globalLogger);
  Setting.setKeychainService(KeychainService.instance());
  await Setting.load();
  if (!clientIdSetting) Setting.setValue('clientId', clientId);
  await KeychainService.instance().detectIfKeychainSupported();

  // --- 9.5. profileDir/settings.json から sync 設定を上書き ---
  const settingsJsonPath = path.join(profileDir, 'settings.json');
  if (await fs.pathExists(settingsJsonPath)) {
    const settingsJson = await fs.readJson(settingsJsonPath);
    const overrideKeys = ['sync.target', 'sync.useReverseProxy', 'sync.reverseProxyUrl'];
    for (const key of overrideKeys) {
      if (key in settingsJson) {
        Setting.setValue(key, settingsJson[key]);
      }
    }
    console.log(`Loaded settings overrides from: ${settingsJsonPath}`);
  }

  const syncTarget = Setting.value('sync.target');
  console.log(`Profile  : ${profileDir}`);
  console.log(`Sync target ID: ${syncTarget}`);

  if (syncTarget !== SyncTargetOneDrive.id()) {
    console.error(
      `Error: このプロファイルの sync.target (${syncTarget}) は OneDrive (${SyncTargetOneDrive.id()}) ではありません。`
    );
    console.error('OneDrive 以外のターゲットはサポートしていません。');
    await db.close();
    process.exit(1);
  }

  const isAuthenticated = await reg.syncTarget().isAuthenticated();
  if (!isAuthenticated) {
    console.error(
      'Error: OneDrive が未認証です。Joplin Desktop / CLI で一度ログインしてください。'
    );
    await db.close();
    process.exit(1);
  }

  // --- 10. 同期実行（Sidebar の「同期」ボタンと同じコードパス）---
  console.log('Starting OneDrive sync...');
  await reg.scheduleSync(0);
  console.log('Sync finished.');

  // --- 11. 後処理 ---
  await reg.cancelTimers();
  await db.close();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
