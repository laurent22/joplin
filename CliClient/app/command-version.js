import { BaseCommand } from './base-command.js';
import { Setting } from 'lib/models/setting.js'
import { _ } from 'lib/locale.js';

class Command extends BaseCommand {

	usage() {
		return 'version';
	}

	description() {
		return 'Displays version information';
	}

	async action(args) {
		const p = require('./package.json');
		this.log(_('%s %s (%s)', p.name, p.version, Setting.value('env')));
	}

}

module.exports = Command;