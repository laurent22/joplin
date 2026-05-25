import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Tag from '@joplin/lib/models/Tag';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import time from '@joplin/lib/time';
import { NoteEntity, TagEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'tag <tag-command> [tag] [note]';
	}

	public override description() {
		return _('<tag-command> can be "add", "remove", "list", or "notetags" to assign or remove [tag] from [note], to list notes associated with [tag], or to list tags associated with [note]. The command `tag list` can be used to list all the tags (use -l for long option).');
	}

	public override options() {
		return [['-l, --long', _('Use long list format. Format is ID, NOTE_COUNT (for notebook), DATE, TODO_CHECKED (for to-dos), TITLE')]];
	}

	public override async action(args: { 'tag-command': string; tag?: string; note?: string; options: { long?: boolean } }) {
		let tag: TagEntity | null = null;
		const options = args.options;

		// app.loadItem's parameter type is narrower (Note | Folder | 'folderOrNote') than the
		// runtime support, which falls through to BaseItem.itemClass(type).loadByTitle for other
		// types. ModelType.Tag is one of those — cast to satisfy the type checker.
		if (args.tag) tag = await app().loadItem(ModelType.Tag as ModelType.Note, args.tag);
		let notes: NoteEntity[] = [];
		if (args.note) {
			notes = await app().loadItems(ModelType.Note, args.note);
		}

		const command = args['tag-command'];

		if (command === 'remove' && !tag) throw new Error(_('Cannot find "%s".', args.tag));

		if (command === 'add') {
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.note));
			if (!tag) tag = await Tag.save({ title: args.tag }, { userSideValidation: true });
			for (let i = 0; i < notes.length; i++) {
				await Tag.addNote(tag.id, notes[i].id);
			}
		} else if (command === 'remove') {
			if (!tag) throw new Error(_('Cannot find "%s".', args.tag));
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.note));
			for (let i = 0; i < notes.length; i++) {
				await Tag.removeNote(tag.id, notes[i].id);
			}
		} else if (command === 'list') {
			if (tag) {
				const notes: NoteEntity[] = await Tag.notes(tag.id);
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
				const tags: TagEntity[] = await Tag.all();
				tags.map(tag => {
					this.stdout(tag.title);
				});
			}
		} else if (command === 'notetags') {
			if (args.tag) {
				const note = await app().loadItem(ModelType.Note, args.tag);
				if (!note) throw new Error(_('Cannot find "%s".', args.tag));
				const tags: TagEntity[] = await Tag.tagsByNoteId(note.id);
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
