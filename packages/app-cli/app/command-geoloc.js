const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('@joplinapp/lib/locale');
const BaseModel = require('@joplinapp/lib/BaseModel').default;
const Note = require('@joplinapp/lib/models/Note.js');

class Command extends BaseCommand {
	usage() {
		return 'geoloc <note>';
	}

	description() {
		return _('Displays a geolocation URL for the note.');
	}

	async action(args) {
		const title = args['note'];

		const item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		const url = Note.geolocationUrl(item);
		this.stdout(url);

		app()
			.gui()
			.showConsole();
	}
}

module.exports = Command;
