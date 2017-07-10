import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { autocompleteFolders } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'use <notebook>';
	}

	description() {
		return 'Switches to [notebook] - all further operations will happen within this notebook.';
	}

	aliases() {
		return ['cd'];
	}

	autocomplete() {
		return { data: autocompleteFolders };
	}

	async action(args) {
		let title = args['notebook'];

		let folder = await Folder.loadByField('title', title);
		if (!folder) throw new Error(_('Invalid folder title: %s', title));
		app().switchCurrentFolder(folder);
	}

}

module.exports = Command;