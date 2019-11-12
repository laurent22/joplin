const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const Tag = require('lib/models/Tag.js');
const BaseModel = require('lib/BaseModel.js');
const { time } = require('lib/time-utils.js');

class Command extends BaseCommand {
	usage() {
		return 'tag <tag-command> [tag] [note]';
	}

	description() {
		return _('<tag-command> can be "add", "remove", "list", or "notetags" to assign or remove [tag] from [note], to list notes associated with [tag], or to list tags associated with [note]. The command `tag list` can be used to list all the tags (use -l for long option).');
	}

	options() {
		return [['-l, --long', _('Use long list format. Format is ID, NOTE_COUNT (for notebook), DATE, TODO_CHECKED (for to-dos), TITLE')]];
	}

	async action(args) {
		let tag = null;
		let options = args.options;

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
				notes.map(note => {
					let line = '';
					if (options.long) {
						line += BaseModel.shortId(note.id);
						line += ' ';
						line += time.formatMsToLocal(note.user_updated_time);
						line += ' ';
					}
					if (note.is_todo) {
						line += '[';
						if (note.todo_completed) {
							line += 'X';
						} else {
							line += ' ';
						}
						line += '] ';
					} else {
						line += '	';
					}
					line += note.title;
					this.stdout(line);
				});
			} else {
				let tags = await Tag.all();
				tags.map(tag => {
					this.stdout(tag.title);
				});
			}
		} else if (command == 'notetags') {
			if (args.tag) {
				const note = await app().loadItem(BaseModel.TYPE_NOTE, args.tag);
				if (!note) throw new Error(_('Cannot find "%s".', args.tag));
				const tags = await Tag.tagsByNoteId(note.id);
				tags.map(tag => {
					this.stdout(tag.title);
				});
			} else {
				throw new Error(_('Cannot find "%s".', ''));
			}
		} else {
			throw new Error(_('Invalid command: "%s"', command));
		}
	}
}

module.exports = Command;
