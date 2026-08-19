import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
const { cliUtils } = require('./cli-utils.js');

interface Args { }

class Command extends BaseCommand {
	public override usage() {
		return 'keymap';
	}

	public override description() {
		return _('Displays the configured keyboard shortcuts.');
	}

	public override compatibleUis() {
		return ['cli', 'gui'];
	}

	public override async action(_args: Args) {
		const keymaps = await app().loadKeymaps();

		this.stdout(_('Configured keyboard shortcuts:'));
		this.stdout('\n');

		const rows = [];
		const padding = '  ';

		rows.push([`${padding}${_('KEYS')}`, _('TYPE'), _('COMMAND')]);
		rows.push([`${padding}----`, '----', '-------']);

		for (const item of keymaps) {
			const formattedKeys = item.keys
				.map((k: string) => (k === ' ' ? `(${_('SPACE')})` : k))
				.join(', ');
			rows.push([padding + formattedKeys, item.type, item.command]);
		}

		cliUtils.printArray(this.stdout.bind(this), rows);

		if (app().gui() && !app().gui().isDummy()) {
			app().gui().showConsole();
			app().gui().maximizeConsole();
		}
	}
}

module.exports = Command;
