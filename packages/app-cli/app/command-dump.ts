import BaseCommand from './base-command';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'dump';
	}

	public override description() {
		return 'Dumps the complete database as JSON.';
	}

	public override hidden() {
		return true;
	}

	public override async action() {
		let items: (NoteEntity | FolderEntity)[] = [];
		const folders = await Folder.all();
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const notes = await Note.previews(folder.id);
			items.push(folder);
			items = items.concat(notes);
		}

		const tags = await Tag.all();
		for (let i = 0; i < tags.length; i++) {
			tags[i].notes_ = await Tag.noteIds(tags[i].id);
		}

		items = items.concat(tags);

		this.stdout(JSON.stringify(items));
	}
}

module.exports = Command;
