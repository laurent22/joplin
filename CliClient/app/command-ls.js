import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteFolders } from './autocomplete.js';
import { sprintf } from 'sprintf-js';
import { time } from 'lib/time-utils.js';
import { vorpalUtils } from './vorpal-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'ls [pattern]';
	}

	description() {
		return 'Displays the notes in [notebook]. Use `ls /` to display the list of notebooks.';
	}
	
	options() {
		return [
			['-n, --limit <num>', 'Displays only the first top <num> notes.'],
			['-s, --sort <field>', 'Sorts the item by <field> (eg. title, updated_time, created_time).'],
			['-r, --reverse', 'Reverses the sorting order.'],
			['-t, --type <type>', 'Displays only the items of the specific type(s). Can be `n` for notes, `t` for todos, or `nt` for notes and todos (eg. `-tt` would display only the todos, while `-ttd` would display notes and todos.'],
			['-f, --format <format>', 'Either "text" or "json"'],
			['-l, --long', 'Use long list format. Format is NOTE_COUNT (for notebook), DATE, TODO_CHECKED (for todos), TITLE'],
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
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let row = [];

				if (options.long) {
					if (modelType == Folder.modelType()) {
						row.push(await Folder.noteCount(item.id));
					}

					row.push(time.unixMsToLocalDateTime(item.updated_time));
				}

				let title = item.title + suffix;
				if (seenTitles.indexOf(item.title) >= 0 || !item.title) {
					title += ' (' + item.id.substr(0,4) + ')';
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