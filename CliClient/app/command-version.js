import { BaseCommand } from './base-command.js';

class Command extends BaseCommand {

	usage() {
		return 'version';
	}

	description() {
		return 'Displays version information';
	}

	async ction(args) {
		const packageJson = require('./package.json');
		this.log(packageJson.name + ' ' + packageJson.version);
	}

}

module.exports = Command;