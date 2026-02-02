import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import BaseModel from '@joplin/lib/BaseModel';
import { homedir } from 'os';

import { DatabaseDriverNode } from '@joplin/lib/database-driver-node.js';

// データベースのシングルトンインスタンス
let database: JoplinDatabase | null = null;
let isInitialized = false;
let initializationPromise: Promise<JoplinDatabase> | null = null;

/**
 * データベースを初期化する（内部関数）
 */
async function _initializeDatabase(): Promise<JoplinDatabase> {
  try {
    // データベースドライバーを作成
    const driver = new DatabaseDriverNode();
    
    // Joplinデータベースインスタンスを作成
    database = new JoplinDatabase(driver);
    
    // データベースファイルを開く
    const dbPath = `${homedir()}/.config/joplin_desktop_test2/database.sqlite`;
    await database.open({ name: dbPath });
    
    // BaseModelにデータベースを設定
    BaseModel.setDb(database);
    
    isInitialized = true;
    console.log('Database initialized successfully:', dbPath);
    
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    database = null;
    isInitialized = false;
    initializationPromise = null;
    throw error;
  }
}

/**
 * データベースを取得する（必要に応じて初期化）
 */
export async function getDatabase(): Promise<JoplinDatabase> {
  // 既に初期化済みの場合はそのまま返す
  if (isInitialized && database) {
    return database;
  }

  // 初期化中の場合は同じPromiseを返す（重複初期化を防ぐ）
  if (initializationPromise) {
    return initializationPromise;
  }

  // 初回初期化
  initializationPromise = _initializeDatabase();
  return initializationPromise;
}

/**
 * データベース接続を閉じる
 */
export async function closeDatabase() {
  if (database) {
    // JoplinDatabaseにcloseメソッドがあれば呼び出す
    database = null;
    isInitialized = false;
    initializationPromise = null;
    console.log('Database connection closed');
  }
}

// モジュールロード時に自動的に初期化を開始
if (typeof window === 'undefined') {
  // サーバーサイドでのみ実行
  initializationPromise = _initializeDatabase();
}
