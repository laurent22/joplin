import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Note } from 'lib/models/note.js';

class Command extends BaseCommand {

	usage() {
		return 'autocompletion <type> [arg1]';
	}

	description() {
		return 'Helper for autocompletion';
	}

	options() {
		return [
			[ '--before <before>', 'before' ],
		];
	}

	hidden() {
		return true;
	}

	async action(args) {
		let output = [];
		if (args.type == 'notes') {
			// TODO:
			if (!app().currentFolder()) throw new Error('no current folder');
			let options = {};
			if (args.options.before) options.titlePattern = args.options.before + '*';
			const notes = await Note.previews(app().currentFolder().id, options);
			output = notes.map((n) => n.title);
		}
		this.log(JSON.stringify(output));
	}

}

module.exports = Command;