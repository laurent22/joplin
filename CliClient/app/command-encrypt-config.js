const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');
const EncryptionService = require('lib/services/EncryptionService');
const MasterKey = require('lib/models/MasterKey');
const { Setting } = require('lib/models/setting.js');

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
			if (!password) {
				this.stdout(_('Operation cancelled'));
				return;
			}

			const service = new EncryptionService();
			const masterKey = await service.generateMasterKey(password);

			await MasterKey.save(masterKey);

			Setting.setValue('encryption.enabled', true);
		}
	}

}

module.exports = Command;