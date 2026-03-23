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
  // settings.json があれば先読みして env 等の定数も上書き可能にする
  const settingsJsonPath = path.join(profileDir, 'settings.json');
  let earlySettingsJson: Record<string, unknown> = {};
  if (fs.existsSync(settingsJsonPath)) {
    try {
      earlySettingsJson = fs.readJsonSync(settingsJsonPath);
    } catch (_) {
      /* ignore */
    }
  }

  // 後で全モジュールインスタンスへ伝播するためマップとして保持する
  const settingConstants: Record<string, string> = {
    appId: 'net.cozic.joplin-cli',
    appType: 'cli',
    env: typeof earlySettingsJson['env'] === 'string' ? earlySettingsJson['env'] : 'prod',
    profileDir: profileDir,
    resourceDirName: 'resources',
    resourceDir: path.join(profileDir, 'resources'),
    tempDir: path.join(profileDir, 'tmp'),
    cacheDir: path.join(profileDir, 'cache'),
    pluginDataDir: path.join(profileDir, 'plugin-data'),
    pluginDir: path.join(profileDir, 'plugins'),
    templateDir: path.join(profileDir, 'templates'),
  };
  for (const [k, v] of Object.entries(settingConstants)) {
    Setting.setConstant(k, v);
  }

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

  // tsx のモジュール分離により Logger.ts インスタンスが別に存在する場合があるため、
  // require.cache 上の全 Logger インスタンスにも initializeGlobalLogger を伝播させる。
  for (const cacheKey of Object.keys(require.cache)) {
    const cached = require.cache[cacheKey]?.exports?.default;
    if (!cached || cached === Logger) continue;
    if (typeof cached.initializeGlobalLogger === 'function') {
      try {
        cached.initializeGlobalLogger(globalLogger);
      } catch (_) {
        /* ignore */
      }
    }
  }

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

  // tsx のモジュールインスタンス分離により require.cache 上に複数の Setting/BaseModel が
  // 存在する場合がある。Setting.load() は主インスタンス（.js）にしか DB の値を読み込まないため、
  // 他のインスタンス（.ts 経由でロードされたもの）にも同じ初期化を行う必要がある。
  for (const cacheKey of Object.keys(require.cache)) {
    const cached = require.cache[cacheKey]?.exports?.default;
    if (!cached || typeof cached !== 'function') continue;

    // BaseModel 系: db を伝播（Setting.load() より前に必要）
    if (typeof cached.setDb === 'function') {
      try {
        cached.setDb(db);
      } catch (_) {
        /* ignore */
      }
    }

    if (typeof cached.cancelScheduleSave !== 'function') continue;
    // 以下は Setting インスタンスのみ
    if (cached === Setting) continue; // 主インスタンスはスキップ

    // autoSave を無効化してタイマークラッシュを防ぐ
    cached.autoSaveEnabled = false;

    // 定数を伝播（env 等が SET_ME のまま残るのを防ぐ）
    if (typeof cached.setConstant === 'function') {
      for (const [k, v] of Object.entries(settingConstants)) {
        try {
          cached.setConstant(k, v);
        } catch (_) {
          /* ignore */
        }
      }
    }

    // KeychainService を伝播
    if (typeof cached.setKeychainService === 'function') {
      try {
        cached.setKeychainService(KeychainService.instance());
      } catch (_) {
        /* ignore */
      }
    }

    // DB から設定を読み込む（auth トークン等を取得するために必要）
    if (typeof cached.load === 'function') {
      try {
        await cached.load();
      } catch (_) {
        /* ignore */
      }
    }

    // load() 後に発生したタイマーもキャンセル
    if (typeof cached.cancelScheduleSave === 'function') cached.cancelScheduleSave();
    if (typeof cached.cancelScheduleChangeEvent === 'function') cached.cancelScheduleChangeEvent();
  }

  // 主インスタンスのタイマーも無効化
  Setting.autoSaveEnabled = false;
  Setting.cancelScheduleSave();
  Setting.cancelScheduleChangeEvent();

  if (!clientIdSetting) Setting.setValue('clientId', clientId);
  await KeychainService.instance().detectIfKeychainSupported();

  // --- 9.5. profileDir/settings.json から sync 設定を上書き ---
  // settingsJsonPath と earlySettingsJson は Step 3 で先読み済み
  if (Object.keys(earlySettingsJson).length > 0) {
    const settingsJson = earlySettingsJson;
    const overrideKeys = ['sync.target', 'sync.useReverseProxy', 'sync.reverseProxyUrl'];

    // まず自分のインスタンスに反映
    for (const key of overrideKeys) {
      if (key in settingsJson) {
        Setting.setValue(key, settingsJson[key]);
      }
    }

    // tsx のモジュール分離により registry.ts が Setting.ts（別インスタンス）を
    // 参照しているため、require.cache 上の全 Setting インスタンスにも伝播させる。
    for (const cacheKey of Object.keys(require.cache)) {
      const cached = require.cache[cacheKey]?.exports?.default;
      if (!cached || typeof cached !== 'function') continue;
      if (cached === Setting) continue;
      if (typeof cached.setValue !== 'function') continue;
      for (const key of overrideKeys) {
        if (key in settingsJson) {
          try {
            cached.setValue(key, settingsJson[key]);
          } catch (_) {
            /* ignore */
          }
        }
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
    process.exit(1);
  }

  // --- 9.6. 診断情報のログ出力 ---
  {
    const { parameters: getParams } = require('@joplin/lib/parameters.js');
    const params = getParams();
    const storedAuth = Setting.value(`sync.${SyncTargetOneDrive.id()}.auth`);
    console.log(`[Debug] env               : ${Setting.value('env')}`);
    console.log(`[Debug] OneDrive client_id: ${params?.oneDrive?.id ?? '(not found)'}`);
    if (storedAuth) {
      try {
        const authObj = JSON.parse(storedAuth);
        // refresh_token の先頭 20 文字だけ表示（秘密情報を保護）
        const refreshSnippet = authObj.refresh_token
          ? String(authObj.refresh_token).slice(0, 20) + '...'
          : '(none)';
        console.log(`[Debug] Stored auth keys  : ${Object.keys(authObj).join(', ')}`);
        console.log(`[Debug] refresh_token hint: ${refreshSnippet}`);
      } catch (_) {
        console.log(`[Debug] Stored auth (raw) : ${String(storedAuth).slice(0, 60)}...`);
      }
    } else {
      console.log('[Debug] Stored auth       : (empty)');
    }
  }

  const isAuthenticated = await reg.syncTarget().isAuthenticated();
  if (!isAuthenticated) {
    console.error(
      'Error: OneDrive が未認証です。Joplin Desktop / CLI で一度ログインしてください。'
    );
    process.exit(1);
  }

  // --- 10. 同期実行（Sidebar の「同期」ボタンと同じコードパス）---
  console.log('Starting OneDrive sync...');
  try {
    await reg.scheduleSync(0);
  } catch (syncError: unknown) {
    const msg = syncError instanceof Error ? syncError.message : String(syncError);
    console.error(`[Sync Error] ${msg}`);
    // OneDrive API エラーレスポンスがある場合は詳細を表示
    if (syncError instanceof Error && (syncError as { responseText?: string }).responseText) {
      console.error(
        '[Sync Error] Response:',
        (syncError as { responseText?: string }).responseText
      );
    }
    throw syncError;
  }
  console.log('Sync finished.');

  // --- 11. 後処理 ---
  await reg.cancelTimers();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
