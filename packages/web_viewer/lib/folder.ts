import { FolderEntity, getDatabase } from './database';

export class Folder {
  public static getAllFolders(): FolderEntity[] {
    const db = getDatabase();
    const folders = db
      .prepare(
        'SELECT id, title, parent_id, updated_time, created_time FROM folders ORDER BY title ASC'
      )
      .all() as FolderEntity[];
    return folders;
  }
}
