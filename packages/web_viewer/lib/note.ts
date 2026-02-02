import { NoteEntity, getDatabase } from './database';

export class Note {
    public static getAllNotesMetadata(): NoteEntity[] {
        const db = getDatabase();
        const notes = db.prepare(
            'SELECT id, parent_id, title, created_time, updated_time, is_conflict, latitude, longitude, altitude, author, source_url, is_todo, todo_due, todo_completed, source, source_application, application_data, `order` FROM notes ORDER BY updated_time DESC'
        ).all() as NoteEntity[];
        return notes;
    }
}
