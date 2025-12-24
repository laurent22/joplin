import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
const { cliUtils } = require('./cli-utils.js');

class Command extends BaseCommand {
	public override usage() {
		return 'keymaps';
	}

	public override description() {
		return _('Displays the configured keyboard shortcuts.');
	}

	public override options(): string[][] {
		return [];
	}

	public override compatibleUis() {
		return ['cli', 'gui'];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(_args: any) {
		const keymaps = await app().loadKeymaps();

		this.stdout(_('Configured keyboard shortcuts:'));
		this.stdout('');

		const rows = [];

		// Add header row
		rows.push(['KEYS', 'TYPE', 'COMMAND']);

		// Add separator row
		rows.push(['----', '----', '-------']);

		// Add keymap rows
		for (const item of keymaps) {
			const formattedKeys = item.keys
				.map((k: string) => (k === ' ' ? '(SPACE)' : k))
				.join(', ');
			rows.push([formattedKeys, item.type, item.command]);
		}

		// Print with left padding
		const padding = '  ';
		const originalStdout = this.stdout.bind(this);
		cliUtils.printArray((line: string) => originalStdout(padding + line), rows);

		if (app().gui() && !app().gui().isDummy()) {
			app().gui().showConsole();
			app().gui().maximizeConsole();
		}
	}
}

module.exports = Command;
