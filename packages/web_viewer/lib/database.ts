import { homedir } from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import { ViewerUtil } from './viewerUtil';

export interface FolderEntity {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
}

export interface NoteEntity {
  id: string;
  parent_id: string;
  title: string;
  created_time: number;
  updated_time: number;
  is_conflict: number;
  latitude: number;
  longitude: number;
  altitude: number;
  author: string;
  source_url: string;
  is_todo: number;
  todo_due: number;
  todo_completed: number;
  source: string;
  source_application: string;
  application_data: string;
  order: number;
}
// データベースのシングルトンインスタンス
let database: Database.Database | null = null;

/**
 * データベースを取得する（必要に応じて初期化）
 */
export function getDatabase(): Database.Database {
  if (database) {
    return database;
  }

 
  // データベースファイルを開く（path.join で適切に結合）
  const dbPath = ViewerUtil.getDabaseFilePath();
  database = new Database(dbPath, { readonly: true });
  
  console.log('Database initialized successfully:', dbPath);
  console.log('Using profile:', path.basename(ViewerUtil.getProfileFolderPath()));
  return database;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase() {
  if (database) {
    database.close();
    database = null;
    console.log('Database connection closed');
  }
}
