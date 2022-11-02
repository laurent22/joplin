const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const Note = require('@joplin/lib/models/Note').default;
const time = require('@joplin/lib/time').default;

class Command extends BaseCommand {
	usage() {
		return 'done <note>';
	}

	description() {
		return _('Marks a to-do as done.');
	}

	static async handleAction(commandInstance, args, isCompleted) {
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

	async action(args) {
		await Command.handleAction(this, args, true);
	}
}

module.exports = Command;
