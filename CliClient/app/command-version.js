const { BaseCommand } = require('./base-command.js');
const Setting = require('lib/models/Setting').default;
const { _ } = require('lib/locale');

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
