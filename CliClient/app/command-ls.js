import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteFolders } from './autocomplete.js';
import { sprintf } from 'sprintf-js';

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

		if (pattern == '/' || !app().currentFolder()) {
			items = await Folder.all(queryOptions);
			suffix = '/';
		} else {
			if (!app().currentFolder()) throw new Error(_('Please select a notebook first.'));
			items = await Note.previews(app().currentFolder().id, queryOptions);
		}

		if (options.format && options.format == 'json') {
			this.log(JSON.stringify(items));
		} else {
			let seenTitles = [];
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let line = '';
				if (!!item.is_todo) {
					line += sprintf('[%s] ', !!item.todo_completed ? 'X' : ' ');
				}
				line += item.title + suffix;

				if (seenTitles.indexOf(item.title) >= 0) {
					line += ' (' + item.id.substr(0,4) + ')';
				} else {
					seenTitles.push(item.title);
				}

				this.log(line);
			}
		}

	}

}

module.exports = Command;