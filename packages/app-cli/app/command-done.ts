import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'done <note>';
	}

	public override description() {
		return _('Marks a to-do as done.');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async handleAction(commandInstance: BaseCommand, args: any, isCompleted: boolean) {
		const note: NoteEntity = await app().loadItem(BaseModel.TYPE_NOTE, args.note);
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		await Command.handleAction(this, args, true);
	}
}

module.exports = Command;
