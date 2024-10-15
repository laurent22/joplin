import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import shim from '../../shim';
import Logger from '@joplin/utils/Logger';
import KvStore from '../KvStore';
import Setting from '../../models/Setting';

const logger = Logger.create('KeychainServiceDriver.electron');

const canUseSafeStorage = () => {
	return !!shim.electronBridge?.()?.safeStorage?.isEncryptionAvailable();
};

const kvStorePrefix = 'KeychainServiceDriver.secureStore.';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {
	public override readonly driverId = 'electron-safeStorage';

	public constructor(appId: string, clientId: string) {
		super(appId, clientId);

		if (canUseSafeStorage() && shim.isLinux()) {
			logger.info('KeychainService Linux backend: ', shim.electronBridge()?.safeStorage?.getSelectedStorageBackend());
		}
	}

	public async supported() {
		return canUseSafeStorage();
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (canUseSafeStorage()) {
			logger.debug('Saving password with electron safe storage. ID: ', name);

			const encrypted = await shim.electronBridge().safeStorage.encryptString(password);
			await KvStore.instance().setValue(`${kvStorePrefix}${name}`, encrypted);
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

		return result;
	}

	public async deletePassword(name: string): Promise<void> {
		if (canUseSafeStorage()) {
			logger.debug('Trying to delete encrypted password with id ', name);
			await KvStore.instance().deleteValue(`${kvStorePrefix}${name}`);
		}
	}
}
