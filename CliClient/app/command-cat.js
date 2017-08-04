import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'cat <note>';
	}

	description() {
		return _('Displays the given note.');
	}

	options() {
		return [
			['-v, --verbose', _('Displays the complete information about note.')],
		];
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['note'];

		let item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));

		const content = args.options.verbose ? await Note.serialize(item) : await Note.serializeForEdit(item);
		this.log(content);
	}

}

module.exports = Command;