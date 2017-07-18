import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'geoloc <title>';
	}

	description() {
		return _('Displays a geolocation URL for the note.');
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['title'];

		let item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		const url = Note.geolocationUrl(item);
		this.log(url);
	}

}

module.exports = Command;