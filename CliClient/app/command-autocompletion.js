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
			[ '--multiline', 'multiline' ],
		];
	}

	hidden() {
		return true;
	}

	async action(args) {
		console.info(args);

		let output = [];
		if (args.type == 'notes') {
			// TODO:
			if (!app().currentFolder()) throw new Error('no current folder');
			let options = {};
			// this.log(JSON.stringify(['XX'+args.options.before+'XX', 'aa','bb']));
			// return;

			//console.info(args.options.before);
			if (args.options.before) options.titlePattern = args.options.before + '*';
			const notes = await Note.previews(app().currentFolder().id, options);
			output = notes.map((n) => n.title);
		}

		if (args.options.multiline) {
			output = output.map((s) => s.replace(/ /g, '\\ '));
			this.log(output.join("\n"));
		} else {
			this.log(JSON.stringify(output));
		}
	}

}

module.exports = Command;