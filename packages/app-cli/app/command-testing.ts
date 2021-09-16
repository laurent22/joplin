const { BaseCommand } = require('./base-command.js');
import { reg } from '@joplin/lib/registry';
import populateDatabase from '@joplin/lib/services/debug/populateDatabase';

class Command extends BaseCommand {
	usage() {
		return 'testing <command> [path]';
	}

	description() {
		return 'testing';
	}

	enabled() {
		return false;
	}

	options(): any[] {
		return [
			['--folder-count <count>', 'Folders to create'],
			['--note-count <count>', 'Notes to create'],
			['--tag-count <count>', 'Tags to create'],
			['--tags-per-note <count>', 'Tags per note'],
			['--silent', 'Silent'],
		];
	}

	async action(args: any) {
		const { command, options } = args;

		if (command === 'populate') {
			await populateDatabase(reg.db(), {
				folderCount: options['folder-count'],
				noteCount: options['note-count'],
				tagCount: options['tag-count'],
				tagsPerNote: options['tags-per-note'],
				silent: options['silent'],
			});
		}
	}

}

module.exports = Command;
