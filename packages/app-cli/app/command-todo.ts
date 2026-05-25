import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'todo <todo-command> <note-pattern>';
	}

	public override description() {
		return _('<todo-command> can either be "toggle" or "clear". Use "toggle" to toggle the given to-do between completed and uncompleted state (If the target is a regular note it will be converted to a to-do). Use "clear" to convert the to-do back to a regular note.');
	}

	public override async action(args: { 'todo-command': string; 'note-pattern': string }) {
		const action = args['todo-command'];
		const pattern = args['note-pattern'];
		const notes: NoteEntity[] = await app().loadItems(ModelType.Note, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];

			this.encryptionCheck(note);

			let toSave: NoteEntity = {
				id: note.id,
			};

			if (action === 'toggle') {
				if (!note.is_todo) {
					toSave = Note.toggleIsTodo(note);
				} else {
					toSave.todo_completed = note.todo_completed ? 0 : time.unixMs();
				}
			} else if (action === 'clear') {
				toSave.is_todo = 0;
			}

			await Note.save(toSave);
		}
	}
}

module.exports = Command;
