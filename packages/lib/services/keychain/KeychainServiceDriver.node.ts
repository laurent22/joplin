import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import shim from '../../shim';
import Logger from '@joplin/utils/Logger';
import KvStore from '../KvStore';
import Setting from '../../models/Setting';

const logger = Logger.create('KeychainServiceDriver.node');

const canUseSafeStorage = () => {
	return !!shim.electronBridge()?.safeStorage?.isEncryptionAvailable();
};

const kvStorePrefix = 'KeychainServiceDriver.secureStore.';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	public constructor(appId: string, clientId: string) {
		super(appId, clientId);

		if (canUseSafeStorage() && shim.isLinux()) {
			logger.info('KeychainService Linux backend: ', shim.electronBridge()?.safeStorage?.getSelectedStorageBackend());
		}
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (canUseSafeStorage()) {
			logger.debug('Saving password with electron safe storage. ID: ', name);

			const encrypted = await shim.electronBridge().safeStorage.encryptString(password);
			await KvStore.instance().setValue(`${kvStorePrefix}${name}`, encrypted);
		} else if (shim.keytar()) {
			logger.debug('Saving password with keytar. ID: ', name);
			await shim.keytar().setPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`, password);
		} else {
			// Unsupported.
			return false;
		}
		return true;
	}

	public async password(name: string): Promise<string> {
		let result: string|null = null;

		if (canUseSafeStorage()) {
			const data = await KvStore.instance().value<string>(`${kvStorePrefix}${name}`);
			if (data !== null) {
				try {
					result = await shim.electronBridge().safeStorage.decryptString(data);
				} catch (e) {
					logger.warn('Decryption of a setting failed. Corrupted data or new keychain password? Error:', e);
					if (shim.isLinux() && Setting.value('env') === 'dev') {
						logger.warn('If running Joplin in development mode with NodeJS installed from the Snap store, consider retrying with NodeJS installed from a different source.');
					}
				}
			}
		}

		// Fall back to keytar for compatibility.
		if (result === null && shim.keytar()) {
			result = await shim.keytar().getPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
		}

		return result;
	}

	public async deletePassword(name: string): Promise<void> {
		if (canUseSafeStorage()) {
			logger.debug('Trying to delete encrypted password with id ', name);
			await KvStore.instance().deleteValue(`${kvStorePrefix}${name}`);
		}

		if (shim.keytar()) {
			logger.debug('Trying to password from the keychain. ID: ', name);
			await shim.keytar().deletePassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
		}
	}

	public async upgradeStorageBackend(secureKeys: string[], newDatabaseVersion: number) {
		if (newDatabaseVersion !== 48) return;

		if (!canUseSafeStorage() || !shim.keytar()) {
			logger.info('Unable to migrate keys -- no keytar or safe storage.');
			return;
		}

		logger.info('Migrating keys to Electron safeStorage...');

		const migratedKeys = [];
		for (const key of secureKeys) {
			const password = await this.password(key);

			// Only delete the password from keytar **after** migrating it to safe storage
			if ((password ?? null) !== null && await this.setPassword(key, password)) {
				migratedKeys.push(key);
			}
		}

		for (const key of migratedKeys) {
			await shim.keytar().deletePassword(`${this.appId}.${key}`, `${this.clientId}@joplin`);
		}

		// Migration logic from the database to secure storage should be handled
		// by Setting.saveAll.

		logger.info(`Migrated ${migratedKeys.length} keys.`);
	}
}
