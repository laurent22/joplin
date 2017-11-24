const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const { Tag } = require('lib/models/tag.js');
const { BaseModel } = require('lib/base-model.js');

class Command extends BaseCommand {

	usage() {
		return 'tag <tag-command> [tag] [note]';
	}

	description() {
		return _('<tag-command> can be "add", "remove" or "list" to assign or remove [tag] from [note], or to list the notes associated with [tag]. The command `tag list` can be used to list all the tags.');
	}
	
	async action(args) {
		let tag = null;
		if (args.tag) tag = await app().loadItem(BaseModel.TYPE_TAG, args.tag);
		let notes = [];
		if (args.note) {
			notes = await app().loadItems(BaseModel.TYPE_NOTE, args.note);
		}

		const command = args['tag-command'];

		if (command == 'remove' && !tag) throw new Error(_('Cannot find "%s".', args.tag));

		if (command == 'add') {
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.note));
			if (!tag) tag = await Tag.save({ title: args.tag }, { userSideValidation: true });
			for (let i = 0; i < notes.length; i++) {
				await Tag.addNote(tag.id, notes[i].id);
			}
		} else if (command == 'remove') {
			if (!tag) throw new Error(_('Cannot find "%s".', args.tag));
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.note));
			for (let i = 0; i < notes.length; i++) {
				await Tag.removeNote(tag.id, notes[i].id);
			}
		} else if (command == 'list') {
			if (tag) {
				let notes = await Tag.notes(tag.id);
				notes.map((note) => { this.stdout(note.title); });
			} else {
				let tags = await Tag.all();
				tags.map((tag) => { this.stdout(tag.title); });
			}
		} else {
			throw new Error(_('Invalid command: "%s"', command));
		}
	}

}

module.exports = Command;