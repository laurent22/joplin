import { NoteEntity, getDatabase } from './database';

export type { NoteEntity };


export interface SearchResult {
    id: string;
    title: string;
    offsets: string;
    matchinfo: Buffer | { type: 'Buffer'; data: number[] };
    user_created_time: number;
    user_updated_time: number;
    is_todo: number;
    todo_completed: number;
    parent_id: string | null;
}

export interface SearchApiResult {
    results: SearchResult[];
    noteMap: Record<string, NoteEntity>;
}

export class Note {
    public static getAllNotesMetadata(): NoteEntity[] {
        const db = getDatabase();
        const notes = db.prepare(
            'SELECT id, parent_id, title, created_time, updated_time, is_conflict, latitude, longitude, altitude, author, source_url, is_todo, todo_due, todo_completed, source, source_application, application_data, `order` FROM notes ORDER BY updated_time DESC'
        ).all() as NoteEntity[];
        return notes;
    }

    public static getNoteById(id: string): any | null {
        const db = getDatabase();
        const stmt = db.prepare(
            'SELECT id, parent_id, title, created_time, updated_time, is_conflict, latitude, longitude, altitude, author, source_url, is_todo, todo_due, todo_completed, source, source_application, application_data, `order`, body FROM notes WHERE id = ?'
        );
        const note = stmt.get(id);
        return note || null;
    }
    public static selectAll(matchQuery: string): SearchResult[] {
        const db = getDatabase();
        const sql = `
            SELECT
                notes_fts.id,
                notes_fts.title,
                offsets(notes_fts) AS offsets,
                matchinfo(notes_fts, 'pcnalx') AS matchinfo,
                notes_fts.user_created_time,
                notes_fts.user_updated_time,
                notes_fts.is_todo,
                notes_fts.todo_completed,
                notes_fts.parent_id
            FROM notes_fts
            WHERE 1 AND notes_fts MATCH ?`;

        const stmt = db.prepare(sql);
        const rows = stmt.all(matchQuery);
        return rows as SearchResult[];
    }
    
    public static byIds(ids: string[], fields: string[] = ['*']): NoteEntity[] {
        if (!ids.length) return [];
        
        const db = getDatabase();
        const placeholders = ids.map(() => '?').join(',');
        const sql = `SELECT ${fields.join(', ')} FROM notes WHERE id IN (${placeholders})`;
        
        const stmt = db.prepare(sql);
        const rows = stmt.all(...ids);
        return rows as NoteEntity[];
    }
    
}
