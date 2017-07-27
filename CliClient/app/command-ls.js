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
		return _('ls [pattern]');
	}

	description() {
		return _('Displays the notes in [notebook]. Use `ls /` to display the list of notebooks.');
	}
	
	options() {
		return [
			[_('-n, --limit <num>'), _('Displays only the first top <num> notes.')],
			[_('-s, --sort <field>'), _('Sorts the item by <field> (eg. title, updated_time, created_time).')],
			['-r, --reverse', _('Reverses the sorting order.')],
			[_('-t, --type <type>'), _('Displays only the items of the specific type(s). Can be `n` for notes, `t` for todos, or `nt` for notes and todos (eg. `-tt` would display only the todos, while `-ttd` would display notes and todos.')],
			[_('-f, --format <format>'), _('Either "text" or "json"')],
			['-l, --long', _('Use long list format. Format is ID, NOTE_COUNT (for notebook), DATE, TODO_CHECKED (for todos), TITLE')],
		];
	}

	autocomplete() {
		return { data: autocompleteFolders };
	}

	async action(args) {
		let pattern = args['pattern'];
		let suffix = '';
		let items = [];
		let options = args.options;

		let queryOptions = {};
		if (options.limit) queryOptions.limit = options.limit;
		if (options.sort) {
			queryOptions.orderBy = options.sort;
			queryOptions.orderByDir = 'ASC';
		}
		if (options.reverse === true) queryOptions.orderByDir = queryOptions.orderByDir == 'ASC' ? 'DESC' : 'ASC';
		queryOptions.caseInsensitive = true;
		if (options.type) {
			queryOptions.itemTypes = [];
			if (options.type.indexOf('n') >= 0) queryOptions.itemTypes.push('note');
			if (options.type.indexOf('t') >= 0) queryOptions.itemTypes.push('todo');
		}
		if (pattern) queryOptions.titlePattern = pattern;

		let modelType = null;
		if (pattern == '/' || !app().currentFolder()) {
			queryOptions.includeConflictFolder = true;
			items = await Folder.all(queryOptions);
			suffix = '/';
			modelType = Folder.modelType();
		} else {
			if (!app().currentFolder()) throw new Error(_('Please select a notebook first.'));
			items = await Note.previews(app().currentFolder().id, queryOptions);
			modelType = Note.modelType();
		}

		if (options.format && options.format == 'json') {
			this.log(JSON.stringify(items));
		} else {
			let hasTodos = false;
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				if (item.is_todo) {
					hasTodos = true;
					break;
				}
			}

			let seenTitles = [];
			let rows = [];
			let shortIdShown = false;
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let row = [];

				if (options.long) {
					row.push(BaseModel.shortId(item.id));
					shortIdShown = true;

					if (modelType == Folder.modelType()) {
						row.push(await Folder.noteCount(item.id));
					}

					row.push(time.unixMsToLocalDateTime(item.updated_time));
				}

				let title = item.title + suffix;
				if (!shortIdShown && (seenTitles.indexOf(item.title) >= 0 || !item.title)) {
					title += ' (' + BaseModel.shortId(item.id) + ')';
				} else {
					seenTitles.push(item.title);
				}

				if (hasTodos) {
					if (item.is_todo) {
						row.push(sprintf('[%s]', !!item.todo_completed ? 'X' : ' '));
					} else {
						row.push('   ');
					}
				}

				row.push(title);

				rows.push(row);
			}

			vorpalUtils.printArray(this, rows);
		}

	}

}

module.exports = Command;