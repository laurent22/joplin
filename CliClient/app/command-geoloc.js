import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';

class Command extends BaseCommand {

	usage() {
		return 'geoloc <note>';
	}

	description() {
		return _('Displays a geolocation URL for the note.');
	}

	async action(args) {
		let title = args['note'];

		let item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		const url = Note.geolocationUrl(item);
		this.stdout(url);

		app().gui().showConsole();
	}

}

module.exports = Command;