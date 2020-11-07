const { BaseCommand } = require('./base-command.js');
const Setting = require('@joplin/lib/models/Setting').default;
const { _ } = require('@joplin/lib/locale');

class Command extends BaseCommand {
	usage() {
		return 'version';
	}

	description() {
		return _('Displays version information');
	}

	async action() {
		const p = require('./package.json');
		this.stdout(_('%s %s (%s)', p.name, p.version, Setting.value('env')));
	}
}

module.exports = Command;
