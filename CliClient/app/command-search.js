import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteFolders } from './autocomplete.js';
import { sprintf } from 'sprintf-js';
import { time } from 'lib/time-utils.js';
import { vorpalUtils } from './vorpal-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'search <pattern> [notebook]';
	}

	description() {
		return _('Searches for the given <pattern> in all the notes.');
	}

	async action(args) {
		let pattern = args['pattern'];
		let folderTitle = args['notebook'];

		let folder = null;
		if (folderTitle) {
			folder = await Folder.loadByTitle(folderTitle);
			if (!folder) throw new Error(_('Cannot find "%s".', folderTitle));
		}

		let fields = Note.previewFields();
		fields.push('body');
		const notes = await Note.previews(folder ? folder.id : null, {
			fields: fields,
			anywherePattern: '*' + pattern + '*',
		});

		const fragmentLength = 50;

		let parents = {};

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			const parent = parents[note.parent_id] ? parents[note.parent_id] : await Folder.load(note.parent_id);
			parents[note.parent_id] = parent;

			const idx = note.body.indexOf(pattern);
			let line = '';
			if (idx >= 0) {
				let fragment = note.body.substr(Math.max(0, idx - fragmentLength / 2), fragmentLength);
				fragment = fragment.replace(/\n/g, ' ');
				line = sprintf('%s: %s / %s: %s', BaseModel.shortId(note.id), note.title, parent.title, fragment);
			} else {
				line = sprintf('%s: %s / %s', BaseModel.shortId(note.id), parent.title, note.title);
			}

			this.log(line);
		}
	}

}

module.exports = Command;