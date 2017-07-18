import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Tag } from 'lib/models/tag.js';

class Command extends BaseCommand {

	usage() {
		return 'dump';
	}

	description() {
		return 'Dumps the complete database as JSON.';
	}

	hidden() {
		return true;
	}

	async action(args) {
		let items = [];
		let folders = await Folder.all();
		for (let i = 0; i < folders.length; i++) {
			let folder = folders[i];
			let notes = await Note.previews(folder.id);
			items.push(folder);
			items = items.concat(notes);
		}

		let tags = await Tag.all();
		for (let i = 0; i < tags.length; i++) {
			tags[i].notes_ = await Tag.tagNoteIds(tags[i].id);
		}

		items = items.concat(tags);
		
		this.log(JSON.stringify(items));
	}

}

module.exports = Command;