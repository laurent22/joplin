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

	public override compatibleUis() {
		return ['cli', 'gui'];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(_args: any) {
		const keymaps = await app().loadKeymaps();

		this.stdout(_('Configured keyboard shortcuts:\n'));

		const rows = [];
		const padding = '  ';

		rows.push([`${padding}KEYS`, 'TYPE', 'COMMAND']);
		rows.push([`${padding}----`, '----', '-------']);

		for (const item of keymaps) {
			const formattedKeys = item.keys
				.map((k: string) => (k === ' ' ? '(SPACE)' : k))
				.join(', ');
			rows.push([padding + formattedKeys, item.type, item.command]);
		}

		cliUtils.printArray(this.stdout.bind(this), rows, rows);

		if (app().gui() && !app().gui().isDummy()) {
			app().gui().showConsole();
			app().gui().maximizeConsole();
		}
	}
}

module.exports = Command;
