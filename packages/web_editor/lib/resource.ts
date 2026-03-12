import { getDatabase } from './database';

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
}
