import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';

class Command extends BaseCommand {

	usage() {
		return 'use <notebook>';
	}

	description() {
		return _('Switches to [notebook] - all further operations will happen within this notebook.');
	}

	autocomplete() {
		return { data: autocompleteFolders };
	}

	async action(args) {
		let folder = await app().loadItem(BaseModel.TYPE_FOLDER, args['notebook']);
		if (!folder) throw new Error(_('Cannot find "%s".', args['notebook']));
		app().switchCurrentFolder(folder);
	}

}

module.exports = Command;