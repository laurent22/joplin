import { splitCommandBatch } from '@joplin/lib/string-utils';
import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import { splitCommandString } from '@joplin/utils';
import iterateStdin from './utils/iterateStdin';
import { readFile } from 'fs-extra';
import app from './app';

interface Options {
	'file-path': string;
	options: {
		'continue-on-failure': boolean;
	};
}

class Command extends BaseCommand {
	public usage() {
		return 'batch <file-path>';
	}

	public options() {
		return [
			// These are present mostly for testing purposes
			['--continue-on-failure', 'Continue running commands when one command in the batch fails.'],
		];
	}

	public description() {
		return _('Runs the commands contained in the text file. There should be one command per line.');
	}

	private streamCommands_ = async function*(filePath: string) {
		const processLines = function*(lines: string) {
			const commandLines = splitCommandBatch(lines);

			for (const command of commandLines) {
				if (!command.trim()) continue;
				yield splitCommandString(command.trim());
			}
		};

		if (filePath === '-') { // stdin
			// Iterating over standard input conflicts with the CLI app's GUI.
			if (app().hasGui()) {
				throw new Error(_('Reading commands from standard input is only available in CLI mode.'));
			}

			for await (const lines of iterateStdin('command> ')) {
				yield* processLines(lines);
			}
		} else {
			const data = await readFile(filePath, 'utf-8');
			yield* processLines(data);
		}
	};

	public async action(options: Options) {
		let lastError;
		for await (const command of this.streamCommands_(options['file-path'])) {
			try {
				await app().refreshCurrentFolder();
				await app().execCommand(command);
			} catch (error) {
				if (options.options['continue-on-failure']) {
					app().stdout(error.message);
					lastError = error;
				} else {
					throw error;
				}
			}
		}

		if (lastError) {
			throw lastError;
		}
	}
}

module.exports = Command;
