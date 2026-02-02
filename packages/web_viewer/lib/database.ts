import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import BaseModel from '@joplin/lib/BaseModel';
import { homedir } from 'os';

const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');

// データベースのシングルトンインスタンス
let database: JoplinDatabase | null = null;
let isInitialized = false;

/**
 * データベースを初期化する
 */
export async function initializeDatabase() {
  if (isInitialized && database) {
    return database;
  }

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
    throw error;
  }
}

/**
 * データベースインスタンスを取得する
 */
export function getDatabase(): JoplinDatabase {
  if (!database || !isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return database;
}

/**
 * データベース接続を閉じる
 */
export async function closeDatabase() {
  if (database) {
    // JoplinDatabaseにcloseメソッドがあれば呼び出す
    database = null;
    isInitialized = false;
    console.log('Database connection closed');
  }
}
