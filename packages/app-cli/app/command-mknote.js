const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const Note = require('@joplin/lib/models/Note').default;

class Command extends BaseCommand {
	usage() {
		return 'mknote <new-note>';
	}

	description() {
		return _('Creates a new note.');
	}

	async action(args) {
		if (!app().currentFolder()) throw new Error(_('Notes can only be created within a notebook.'));

		let note = {
			title: args['new-note'],
			parent_id: app().currentFolder().id,
		};

		note = await Note.save(note);
		Note.updateGeolocation(note.id);

		app().switchCurrentFolder(app().currentFolder());
	}
}

module.exports = Command;
