const BaseCommand = require('./base-command').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;
const Tag = require('@joplin/lib/models/Tag').default;

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

	async action() {
		let items = [];
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
