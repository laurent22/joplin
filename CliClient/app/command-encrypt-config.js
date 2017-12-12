const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const { Folder } = require('lib/models/folder.js');
const { importEnex } = require('lib/import-enex');
const { filename, basename } = require('lib/path-utils.js');
const { cliUtils } = require('./cli-utils.js');

class Command extends BaseCommand {

	usage() {
		return 'encrypt-config <command>';
	}

	description() {
		return _('Manages encryption configuration.');
	}

	async action(args) {
		// init
		// change-password

		if (args.command === 'init') {
			const password = await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
			this.logger().info(password);
		}
	}

}

module.exports = Command;