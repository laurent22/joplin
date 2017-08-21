import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'done <note>';
	}

	description() {
		return _('Marks a todo as done.');
	}

	static async handleAction(args, isCompleted) {
		const note = await app().loadItem(BaseModel.TYPE_NOTE, args.note);
		if (!note) throw new Error(_('Cannot find "%s".', args.note));
		if (!note.is_todo) throw new Error(_('Note is not a todo: "%s"', args.note));

		const todoCompleted = !!note.todo_completed;

		if (isCompleted === todoCompleted) return;

		await Note.save({
			id: note.id,
			todo_completed: isCompleted ? time.unixMs() : 0,
		});
	}

	async action(args) {
		Command.handleAction(args, true);
	}

}

module.exports = Command;