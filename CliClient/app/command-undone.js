import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';

const CommandDone = require('./command-done.js');

class Command extends BaseCommand {

	usage() {
		return 'undone <note>';
	}

	description() {
		return _('Marks a todo as non-completed.');
	}

	async action(args) {
		CommandDone.handleAction(args, false);
	}

}

module.exports = Command;