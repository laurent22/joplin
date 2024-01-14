import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';

class Command extends BaseCommand {
	public override usage() {
		return 'done <note>';
	}

	public override description() {
		return _('Marks a to-do as done.');
	}

	public static async handleAction(commandInstance: BaseCommand, args: any, isCompleted: boolean) {
		const note = await app().loadItem(BaseModel.TYPE_NOTE, args.note);
		commandInstance.encryptionCheck(note);
		if (!note) throw new Error(_('Cannot find "%s".', args.note));
		if (!note.is_todo) throw new Error(_('Note is not a to-do: "%s"', args.note));

		const todoCompleted = !!note.todo_completed;

		if (isCompleted === todoCompleted) return;

		await Note.save({
			id: note.id,
			todo_completed: isCompleted ? time.unixMs() : 0,
		});
	}

	public override async action(args: any) {
		await Command.handleAction(this, args, true);
	}
}

module.exports = Command;
