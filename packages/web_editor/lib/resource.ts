import { getDatabase } from './database';
import { ViewerUtil } from './viewerUtil';
import fs from 'fs/promises';
import path from 'path';

export interface ResourceEntity {
  id: string;
  title: string;
  mime: string;
  filename: string;
  file_extension: string;
  size: number;
  created_time: number;
  updated_time: number;
}

export class Resource {
  /**
   * resource テーブルへメタデータを INSERT (または REPLACE) する。
   * 併せて resource_local_states に fetch_status=2 (ready) を登録する。
   *
   * packages/lib/shim-init-node.js の createResourceFromPath 末尾の
   *   Resource.save(resource, { isNew: true })
   * に相当する処理。
   */
  public static save(resource: ResourceEntity): ResourceEntity {
    const db = getDatabase();
    const now = Date.now();
    const entity: ResourceEntity = {
      ...resource,
      created_time: resource.created_time || now,
      updated_time: now,
    };

    db.prepare(
      `INSERT OR REPLACE INTO resources
         (id, title, mime, filename, file_extension, size, created_time, updated_time)
       VALUES
         (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entity.id,
      entity.title,
      entity.mime,
      entity.filename,
      entity.file_extension,
      entity.size,
      entity.created_time,
      entity.updated_time
    );

    // resource_local_states: fetch_status=2 は「ローカルに存在する（ready）」を意味する
    const existing = db
      .prepare('SELECT id FROM resource_local_states WHERE resource_id = ?')
      .get(entity.id);

    if (!existing) {
      db.prepare(
        `INSERT INTO resource_local_states (resource_id, fetch_status, fetch_error)
         VALUES (?, 2, '')`
      ).run(entity.id);
    }

    return entity;
  }

  /**
   * リソースを削除する。
   * 以下を順番にクリーンアップする:
   *   1. ファイルシステム上のリソースファイル
   *   2. resources             — リソースのメタデータ本体
   *   3. note_resources        — ノートとリソースの紐付け
   *   4. resource_local_states — ローカルのフェッチ状態
   *
   * packages/lib/models/Resource.ts の batchDelete に相当する処理。
   */
  public static async delete(id: string): Promise<void> {
    const db = getDatabase();

    // DB からファイル拡張子を取得してファイルパスを構築
    const row = db.prepare('SELECT file_extension FROM resources WHERE id = ?').get(id) as
      | { file_extension: string }
      | undefined;

    if (row) {
      const ext = row.file_extension ? `.${row.file_extension}` : '';
      const filename = `${id}${ext}`;
      const filePath = path.join(ViewerUtil.getResourceFolderPath(), filename);
      await fs.unlink(filePath).catch(() => {
        // ファイルが既に存在しない場合は無視する
      });
    }

    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    db.prepare('DELETE FROM note_resources WHERE resource_id = ?').run(id);
    db.prepare('DELETE FROM resource_local_states WHERE resource_id = ?').run(id);
  }
}
