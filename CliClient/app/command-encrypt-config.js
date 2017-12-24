const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');
const EncryptionService = require('lib/services/EncryptionService');
const MasterKey = require('lib/models/MasterKey');
const Setting = require('lib/models/Setting.js');

class Command extends BaseCommand {

	usage() {
		return 'encrypt-config <command>';
	}

	description() {
		return _('Manages encryption configuration.');
	}

	options() {
		return [
			// This is here mostly for testing - shouldn't be used
			['-p, --password <password>', 'Use this password as master password (For security reasons, it is not recommended to use this option).'],
		];
	}

	async action(args) {
		// init
		// change-password

		const options = args.options;

		if (args.command === 'init') {
			const password = options.password ? options.password.toString() : await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
			if (!password) {
				this.stdout(_('Operation cancelled'));
				return;
			}

			const service = new EncryptionService();
			let masterKey = await service.generateMasterKey(password);
			masterKey = await MasterKey.save(masterKey);
			await service.enableEncryption(masterKey, password);
		}
	}

}

module.exports = Command;