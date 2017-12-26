const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');
const EncryptionService = require('lib/services/EncryptionService');
const DecryptionWorker = require('lib/services/DecryptionWorker');
const MasterKey = require('lib/models/MasterKey');
const Setting = require('lib/models/Setting.js');

class Command extends BaseCommand {

	usage() {
		return 'e2ee <command>';
	}

	description() {
		return _('Manages E2EE configuration. Commands are `enable`, `disable` and `decrypt`.');
	}

	options() {
		return [
			// This is here mostly for testing - shouldn't be used
			['-p, --password <password>', 'Use this password as master password (For security reasons, it is not recommended to use this option).'],
		];
	}

	async action(args) {
		// change-password

		const options = args.options;

		if (args.command === 'enable') {
			const password = options.password ? options.password.toString() : await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
			if (!password) {
				this.stdout(_('Operation cancelled'));
				return;
			}

			await EncryptionService.instance().generateMasterKeyAndEnableEncryption(password);
			return;
		}

		if (args.command === 'disable') {
			await EncryptionService.instance().disableEncryption();
			return;
		}

		if (args.command === 'decrypt') {
			while (true) {
				try {
					await DecryptionWorker.instance().start();
					break;
				} catch (error) {
					if (error.code === 'masterKeyNotLoaded') {
						const masterKeyId = error.masterKeyId;
						const password = await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
						if (!password) {
							this.stdout(_('Operation cancelled'));
							return;
						}
						Setting.setObjectKey('encryption.passwordCache', masterKeyId, password);
						await EncryptionService.instance().loadMasterKeysFromSettings();
						continue;
					}

					throw error;
				}
			}
			return;
		}
	}

}

module.exports = Command;