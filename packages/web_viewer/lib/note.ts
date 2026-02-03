import { NoteEntity, getDatabase } from './database';

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
}
