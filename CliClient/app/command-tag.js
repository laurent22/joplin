import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Tag } from 'lib/models/tag.js';
import { BaseModel } from 'lib/base-model.js';

class Command extends BaseCommand {

	usage() {
		return 'tag <command> [tag] [note]';
	}

	description() {
		return '<command> can be "add", "remove" or "list" to assign or remove [tag] from [note], or to list the notes associated with [tag]. The command `tag list` can be used to list all the tags.';
	}
	
	async action(args) {
		let tag = null;
		if (args.tag) tag = await app().loadItem(BaseModel.TYPE_TAG, args.tag);
		let note = null;
		if (args.note) note = await app().loadItem(BaseModel.TYPE_NOTE, args.note);

		if (args.command == 'remove' && !tag) throw new Error(_('Tag does not exist: "%s"', args.tag));

		if (args.command == 'add') {
			if (!note) throw new Error(_('Note does not exist: "%s"', args.note));
			if (!tag) tag = await Tag.save({ title: args.tag });
			await Tag.addNote(tag.id, note.id);
		} else if (args.command == 'remove') {
			if (!tag) throw new Error(_('Tag does not exist: "%s"', args.tag));
			if (!note) throw new Error(_('Note does not exist: "%s"', args.note));
			await Tag.removeNote(tag.id, note.id);
		} else if (args.command == 'list') {
			if (tag) {
				let notes = await Tag.notes(tag.id);
				notes.map((note) => { this.log(note.title); });
			} else {
				let tags = await Tag.all();
				tags.map((tag) => { this.log(tag.title); });
			}
		} else {
			throw new Error(_('Invalid command: "%s"', args.command));
		}
	}

}

module.exports = Command;