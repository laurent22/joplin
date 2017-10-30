import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'todo <todo-command> <note-pattern>';
	}

	description() {
		return _('<todo-command> can either be "toggle" or "clear". Use "toggle" to toggle the given to-do between completed and uncompleted state (If the target is a regular note it will be converted to a to-do). Use "clear" to convert the to-do back to a regular note.');
	}

	async action(args) {
		const action = args['todo-command'];
		const pattern = args['note-pattern'];
		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];

			let toSave = {
				id: note.id,
			};

			if (action == 'toggle') {
				if (!note.is_todo) {
					toSave = Note.toggleIsTodo(note);
				} else {
					toSave.todo_completed = note.todo_completed ? 0 : time.unixMs();
				}
			} else if (action == 'clear') {
				toSave.is_todo = 0;
			}			

			await Note.save(toSave);
		}
	}

}

module.exports = Command;