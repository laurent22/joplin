const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');

class Command extends BaseCommand {
	usage() {
		return 'rmnote <note-pattern>';
	}

	description() {
		return _('Deletes the notes matching <note-pattern>.');
	}

	options() {
		return [['-f, --force', _('Deletes the notes without asking for confirmation.')]];
	}

	async action(args) {
		const pattern = args['note-pattern'];
		const force = args.options && args.options.force === true;

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		const ok = force ? true : await this.prompt(notes.length > 1 ? _('%d notes match this pattern. Delete them?', notes.length) : _('Delete note?'), { booleanAnswerDefault: 'n' });
		if (!ok) return;
		const ids = notes.map(n => n.id);
		await Note.batchDelete(ids);
	}
}

module.exports = Command;
