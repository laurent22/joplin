import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import BaseItem from '@joplin/lib/models/BaseItem';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import * as pathUtils from '@joplin/lib/path-utils';
import { getEncryptionEnabled, localSyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { generateMasterKeyAndEnableEncryption, getMasterPassword, loadMasterKeysFromSettings, resolveE2eeEnabledStateConflict, masterPasswordIsValid, setupAndDisableEncryption } from '@joplin/lib/services/e2ee/utils';
import { fromFile as fileTypeFromFile } from 'file-type';
import { formatPublicKeyFingerprint, isPublicPrivateKeyPairValid, ppkPublicKeyFingerprint } from '@joplin/lib/services/e2ee/ppk/ppk';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('command-e2ee');

class Command extends BaseCommand {
	public usage() {
		return 'e2ee <command> [path]';
	}

	public description() {
		return _('Manages E2EE configuration. Commands are `enable`, `re-enable`, `disable`, `decrypt`, `status`, `public-key`, `decrypt-file`, and `target-status`.'); // `generate-ppk`
	}

	public options() {
		return [
			// This is here mostly for testing - shouldn't be used
			['-p, --password <password>', 'Use this password as master password (For security reasons, it is not recommended to use this option).'],
			['-v, --verbose', 'More verbose output for the `target-status` and `public-key` commands'],
			['-o, --output <directory>', 'Output directory'],
			['--retry-failed-items', 'Applies to `decrypt` command - retries decrypting items that previously could not be decrypted.'],
			['-f, --force', 'Do not ask for input on failure'],
		];
	}

	public async action(args: { command: string; path?: string; options: { password?: string; verbose?: boolean; output?: string; 'retry-failed-items'?: boolean; force?: boolean } }) {
		const options = args.options;

		const askForMasterKey = async (error: { masterKeyId: string }) => {
			const masterKeyId = error.masterKeyId;
			const password = await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
			if (!password) {
				this.stdout(_('Operation cancelled'));
				return false;
			}

			const masterKey = localSyncInfo().masterKeys.find(mk => mk.id === masterKeyId);
			if (!(await masterPasswordIsValid(password, masterKey))) {
				this.stdout(_('Invalid password'));
				return false;
			}

			Setting.setObjectValue('encryption.passwordCache', masterKeyId, password);
			await loadMasterKeysFromSettings(EncryptionService.instance());
			return true;
		};

		const startDecryption = async () => {
			this.stdout(_('Starting decryption... Please wait as it may take several minutes depending on how much there is to decrypt.'));
			while (true) {
				try {
					const result = await DecryptionWorker.instance().start();

					if (result.error) throw result.error;

					const line = [];
					line.push(_('Decrypted items: %d', result.decryptedItemCount));
					if (result.skippedItemCount) line.push(_('Skipped items: %d (use --retry-failed-items to retry decrypting them)', result.skippedItemCount));
					this.stdout(line.join('\n'));
					break;
				} catch (error) {
					if (error.code === 'masterKeyNotLoaded' && !args.options.force) {
						const ok = await askForMasterKey(error);
						if (!ok) return;
						continue;
					}

					throw error;
				}
			}

			this.stdout(_('Completed decryption.'));
		};

		if (args.command === 're-enable') {
			if (!localSyncInfo().e2ee) {
				throw new Error(_('This command can only be used to resolve E2EE enabled state conflicts. To enable encryption for the first time, use "e2ee enable".'));
			}

			await resolveE2eeEnabledStateConflict(
				EncryptionService.instance(),
				true,
				action => this.dispatch(action),
			);
			if (!localSyncInfo().e2ee) throw new Error('Failed to re-enable E2EE');

			this.stdout(_('Re-enabled E2EE. Sync to apply changes.'));
			return;
		}

		if (args.command === 'enable') {
			const argPassword = options.password ? options.password.toString() : '';
			const password = argPassword ? argPassword : await this.prompt(_('Enter master password:'), { type: 'string', secure: true });
			if (!password) {
				this.stdout(_('Operation cancelled'));
				return;
			}

			// If the password was passed via command line, we don't ask for
			// confirmation. This is to allow setting up E2EE entirely from the
			// command line.
			if (!argPassword) {
				const password2 = await this.prompt(_('Confirm password:'), { type: 'string', secure: true });
				if (!password2) {
					this.stdout(_('Operation cancelled'));
					return;
				}
				if (password !== password2) {
					this.stdout(_('Passwords do not match!'));
					return;
				}
			}

			await generateMasterKeyAndEnableEncryption(EncryptionService.instance(), password);
			return;
		}

		if (args.command === 'disable') {
			await setupAndDisableEncryption(EncryptionService.instance());
			return;
		}

		if (args.command === 'decrypt') {
			if (args.path) {
				const plainText = await EncryptionService.instance().decryptString(args.path);
				this.stdout(plainText);
			} else {
				if (args.options['retry-failed-items']) await DecryptionWorker.instance().clearDisabledItems();
				await startDecryption();
			}

			return;
		}

		if (args.command === 'status') {
			const enabled = getEncryptionEnabled();
			this.stdout(_('Encryption is: %s', enabled ? _('Enabled') : _('Disabled')));

			if (enabled) {
				const ppk = localSyncInfo().ppk;

				if (!getMasterPassword(false)) {
					this.stdout(_('Missing master password'));
				} else if (!await masterPasswordIsValid(getMasterPassword())) {
					this.stdout(_('Invalid master password'));
				} else if (!ppk) {
					this.stdout(_('No public-private key pair'));
				} else {
					try {
						const ppkValid = await isPublicPrivateKeyPairValid(EncryptionService.instance(), ppk, getMasterPassword());
						if (!ppkValid) {
							this.stdout(_('Invalid public-private key pair'));
						}
					} catch (error) {
						this.stdout(`Failed to check public-private key pair: ${error}`);
					}
				}
			}
			return;
		}

		if (args.command === 'public-key') {
			const ppk = localSyncInfo().ppk;
			try {
				if (ppk) {
					const ppkValid = await isPublicPrivateKeyPairValid(EncryptionService.instance(), ppk, getMasterPassword());
					if (!ppkValid) {
						throw new Error(_('Key pair is not valid.'));
					}

					const fingerprint = await ppkPublicKeyFingerprint(ppk);
					this.stdout(_('Public key fingerprint: %s', formatPublicKeyFingerprint(fingerprint)));

					if (options.verbose) {
						this.stdout(_('Full public key: %s', ppk.publicKey));
					}
				} else {
					this.stdout(_('No public-private key pair.'));

					if (!getEncryptionEnabled()) {
						this.stdout(_('Enable encryption ("%s") to create a key pair.', 'e2ee enable'));
					}
				}
			} catch (error) {
				logger.warn('Failed to get public key fingerprint:', error);
				this.stdout(_('Failed to get public key fingerprint: %s', error.message));
			}
			return;
		}

		if (args.command === 'decrypt-file') {
			while (true) {
				try {
					const outputDir = options.output ? options.output : require('os').tmpdir();
					let outFile = `${outputDir}/${pathUtils.filename(args.path)}.${Date.now()}.bin`;
					await EncryptionService.instance().decryptFile(args.path, outFile);
					const detectedType = await fileTypeFromFile(outFile);

					if (detectedType) {
						const newOutFile = `${outFile}.${detectedType.ext}`;
						await shim.fsDriver().move(outFile, newOutFile);
						outFile = newOutFile;
					}

					this.stdout(outFile);
					break;
				} catch (error) {
					if (error.code === 'masterKeyNotLoaded') {
						const ok = await askForMasterKey(error);
						if (!ok) return;
						continue;
					}

					throw error;
				}
			}
			return;
		}

		// if (args.command === 'generate-ppk') {
		// 	const syncInfo = localSyncInfo();
		// 	if (syncInfo.ppk) throw new Error('This account already has a public-private key pair');

		// 	const argPassword = options.password ? options.password.toString() : '';
		// 	if (!argPassword) throw new Error('Password must be provided'); // TODO: should get from prompt
		// 	const ppk = await generateKeyPair(EncryptionService.instance(), argPassword);

		// 	syncInfo.ppk = ppk;
		// 	saveLocalSyncInfo(syncInfo);
		// 	await Setting.saveAll();
		// }

		if (args.command === 'target-status') {
			const fs = require('fs-extra');

			const targetPath = args.path;
			if (!targetPath) throw new Error('Please specify the sync target path.');

			const dirPaths = function(targetPath: string) {
				const paths: string[] = [];
				// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
				fs.readdirSync(targetPath).forEach((path: string) => {
					paths.push(path);
				});
				return paths;
			};

			let itemCount = 0;
			let resourceCount = 0;
			let encryptedItemCount = 0;
			let encryptedResourceCount = 0;
			let otherItemCount = 0;

			const encryptedPaths = [];
			const decryptedPaths = [];

			const paths = dirPaths(targetPath);

			for (let i = 0; i < paths.length; i++) {
				const path = paths[i];
				const fullPath = `${targetPath}/${path}`;
				const stat = await fs.stat(fullPath);

				// this.stdout(fullPath);

				if (path === '.resource') {
					const resourcePaths = dirPaths(fullPath);
					for (let j = 0; j < resourcePaths.length; j++) {
						const resourcePath = resourcePaths[j];
						resourceCount++;
						const fullResourcePath = `${fullPath}/${resourcePath}`;
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

			this.stdout(`Encrypted items: ${encryptedItemCount}/${itemCount}`);
			this.stdout(`Encrypted resources: ${encryptedResourceCount}/${resourceCount}`);
			this.stdout(`Other items (never encrypted): ${otherItemCount}`);

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
