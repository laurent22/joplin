const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const { sprintf } = require('sprintf-js');
const { time } = require('lib/time-utils.js');
const { cliUtils } = require('./cli-utils.js');

class Command extends BaseCommand {
	usage() {
		return 'ls [note-pattern]';
	}

	description() {
		return _('Displays the notes in the current notebook. Use `ls /` to display the list of notebooks.');
	}

	enabled() {
		return false;
	}

	options() {
		return [['-n, --limit <num>', _('Displays only the first top <num> notes.')], ['-s, --sort <field>', _('Sorts the item by <field> (eg. title, updated_time, created_time).')], ['-r, --reverse', _('Reverses the sorting order.')], ['-t, --type <type>', _('Displays only the items of the specific type(s). Can be `n` for notes, `t` for to-dos, or `nt` for notes and to-dos (eg. `-tt` would display only the to-dos, while `-ttd` would display notes and to-dos.')], ['-f, --format <format>', _('Either "text" or "json"')], ['-l, --long', _('Use long list format. Format is ID, NOTE_COUNT (for notebook), DATE, TODO_CHECKED (for to-dos), TITLE')]];
	}

	async action(args) {
		let pattern = args['note-pattern'];
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
		queryOptions.uncompletedTodosOnTop = Setting.value('uncompletedTodosOnTop');

		let modelType = null;
		if (pattern == '/' || !app().currentFolder()) {
			queryOptions.includeConflictFolder = true;
			items = await Folder.all(queryOptions);
			modelType = Folder.modelType();
		} else {
			if (!app().currentFolder()) throw new Error(_('Please select a notebook first.'));
			items = await Note.previews(app().currentFolder().id, queryOptions);
			modelType = Note.modelType();
		}

		if (options.format && options.format == 'json') {
			this.stdout(JSON.stringify(items));
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

					row.push(time.formatMsToLocal(item.user_updated_time));
				}

				let title = item.title;
				if (!shortIdShown && (seenTitles.indexOf(item.title) >= 0 || !item.title)) {
					title += ` (${BaseModel.shortId(item.id)})`;
				} else {
					seenTitles.push(item.title);
				}

				if (hasTodos) {
					if (item.is_todo) {
						row.push(sprintf('[%s]', item.todo_completed ? 'X' : ' '));
					} else {
						row.push('   ');
					}
				}

				row.push(title);

				rows.push(row);
			}

			cliUtils.printArray(this.stdout.bind(this), rows);
		}
	}
}

module.exports = Command;
