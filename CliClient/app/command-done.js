const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const { time } = require('lib/time-utils.js');

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
