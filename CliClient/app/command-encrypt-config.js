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
			
			let masterKey = await service.generateMasterKey(password);
			masterKey = await MasterKey.save(masterKey);

			Setting.setValue('encryption.enabled', true);
			Setting.setValue('encryption.activeMasterKeyId', masterKey.id);

			let passwordCache = Setting.value('encryption.passwordCache');
			passwordCache[masterKey.id] = password;
			Setting.setValue('encryption.passwordCache', passwordCache);
		}
	}

}

module.exports = Command;