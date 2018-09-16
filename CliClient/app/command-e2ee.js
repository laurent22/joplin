const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');
const EncryptionService = require('lib/services/EncryptionService');
const DecryptionWorker = require('lib/services/DecryptionWorker');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem');
const Setting = require('lib/models/Setting.js');

class Command extends BaseCommand {

	usage() {
		return 'e2ee <command> [path]';
	}

	description() {
		return _('Manages E2EE configuration. Commands are `enable`, `disable`, `decrypt`, `status` and `target-status`.');
	}

	options() {
		return [
			// This is here mostly for testing - shouldn't be used
			['-p, --password <password>', 'Use this password as master password (For security reasons, it is not recommended to use this option).'],
			['-v, --verbose', 'More verbose output for the `target-status` command'],
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
					if (args.path) {
						const plainText = await EncryptionService.instance().decryptString(args.path);
						this.stdout(plainText);
						return;
					} else {
						if (process.stdin.isTTY) {
							this.stdout(_('Starting decryption... Please wait as it may take several minutes depending on how much there is to decrypt.'));
							await DecryptionWorker.instance().start();
							this.stdout(_('Completed decryption.'));
							return;
						} else {
							// var repl = require("repl");
							// var r = repl.start("node> ");

							const text = await new Promise((accept, reject) => {
								var buffer = '';
								process.stdin.setEncoding('utf8');
								process.stdin.on('data', function(chunk) {
										buffer += chunk;
										// process.stdout.write(chunk);
								});
								process.stdin.on('end', function() {
									accept(buffer.trim());
								});
							});

							if (text.length > 0) {
								var cipherText = text;
								try {
									var item = await BaseItem.unserialize(text);
									cipherText = item.encryption_cipher_text;
								} catch (error) {
									// we already got the pure cipher text
								}
								const plainText = await EncryptionService.instance().decryptString(cipherText);
								this.stdout(plainText);
							}
							return;
						}
					}
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

		if (args.command === 'status') {
			this.stdout(_('Encryption is: %s', Setting.value('encryption.enabled') ? _('Enabled') : _('Disabled')));
			return;
		}

		if (args.command === 'target-status') {
			const fs = require('fs-extra');
			const pathUtils = require('lib/path-utils.js');
			const fsDriver = new (require('lib/fs-driver-node.js').FsDriverNode)();

			const targetPath = args.path;
			if (!targetPath) throw new Error('Please specify the sync target path.');

			const dirPaths = function(targetPath) {
				let paths = [];
				fs.readdirSync(targetPath).forEach((path) => {
					paths.push(path);
				});
				return paths;
			}

			let itemCount = 0;
			let resourceCount = 0;
			let encryptedItemCount = 0;
			let encryptedResourceCount = 0;
			let otherItemCount = 0;

			let encryptedPaths = [];
			let decryptedPaths = [];

			let paths = dirPaths(targetPath);

			for (let i = 0; i < paths.length; i++) {
				const path = paths[i];
				const fullPath = targetPath + '/' + path;
				const stat = await fs.stat(fullPath);

				// this.stdout(fullPath);

				if (path === '.resource') {
					let resourcePaths = dirPaths(fullPath);
					for (let j = 0; j < resourcePaths.length; j++) {
						const resourcePath = resourcePaths[j];
						resourceCount++;
						const fullResourcePath = fullPath + '/' + resourcePath;
						const isEncrypted = await EncryptionService.instance().fileIsEncrypted(fullResourcePath);
						if (isEncrypted) {
							encryptedResourceCount++;
							encryptedPaths.push(fullResourcePath);
						} else {
							decryptedPaths.push(fullResourcePath);
						}
					}
				} else if (stat.isDirectory()) {
					continue;
				} else {
					const content = await fs.readFile(fullPath, 'utf8');
					const item = await BaseItem.unserialize(content);
					const ItemClass = BaseItem.itemClass(item);

					if (!ItemClass.encryptionSupported()) {
						otherItemCount++;
						continue;
					}

					itemCount++;

					const isEncrypted = await EncryptionService.instance().itemIsEncrypted(item);

					if (isEncrypted) {
						encryptedItemCount++;
						encryptedPaths.push(fullPath);
					} else {
						decryptedPaths.push(fullPath);
					}
				}
			}

			this.stdout('Encrypted items: ' + encryptedItemCount + '/' + itemCount);
			this.stdout('Encrypted resources: ' + encryptedResourceCount + '/' + resourceCount);
			this.stdout('Other items (never encrypted): ' + otherItemCount);

			if (options.verbose) {
				this.stdout('');
				this.stdout('# Encrypted paths');
				this.stdout('');
				for (let i = 0; i < encryptedPaths.length; i++) {
					const path = encryptedPaths[i];
					this.stdout(path);
				}

				this.stdout('');
				this.stdout('# Decrypted paths');
				this.stdout('');
				for (let i = 0; i < decryptedPaths.length; i++) {
					const path = decryptedPaths[i];
					this.stdout(path);
				}
			}

			return;
		}
	}

}

module.exports = Command;
