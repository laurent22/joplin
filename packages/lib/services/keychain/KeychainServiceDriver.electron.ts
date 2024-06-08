import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import KeychainServiceDriverLegacy from './KeychainServiceDriver.keytar';
import shim from '../../shim';
import JoplinDatabase from '../../JoplinDatabase';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('KeychainServiceDriver.node');

const canUseSafeStorage = () => {
	return !!shim.electronBridge()?.safeStorage?.isEncryptionAvailable();
};

const encryptedSettingKey = (key: string) => {
	return `encryptedValue.${key}`;
};

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	private legacyDriver_: KeychainServiceDriverBase;
	private tableName = 'settings';

	public constructor(appId: string, clientId: string, private db: JoplinDatabase) {
		super(appId, clientId);

		this.legacyDriver_ = new KeychainServiceDriverLegacy(appId, clientId);
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (canUseSafeStorage()) {
			logger.debug('Saving password with electron safe storage. ID: ', name);

			const encrypted = await shim.electronBridge().safeStorage.encryptString(password);
			await this.db.exec(
				`INSERT OR REPLACE INTO ${this.tableName} (\`key\`, \`value\`) VALUES (?, ?)`,
				[encryptedSettingKey(name), encrypted],
			);
			return true;
		} else {
			return this.legacyDriver_.setPassword(name, password);
		}
	}

	public async password(name: string): Promise<string> {
		let result: string|null = null;

		if (canUseSafeStorage()) {
			const data = await this.db.selectOne(`SELECT * FROM ${this.tableName} WHERE key = ?`, [encryptedSettingKey(name)]);
			if (data?.value) {
				try {
					result = await shim.electronBridge().safeStorage.decryptString(data.value);
				} catch (e) {
					logger.warn('Decryption of a setting failed. Corrupted data or new keychain password? Error:', e);
				}
			}
		}

		// Fall back to keytar for compatibility.
		if (result === null) {
			result = await this.legacyDriver_.password(name);
		}

		return result;
	}

	public async deletePassword(name: string): Promise<void> {
		if (canUseSafeStorage()) {
			logger.debug('Trying to delete encrypted password with id ', name);
			await this.db.exec(`DELETE FROM ${this.tableName} WHERE key = ?`, [encryptedSettingKey(name)]);
		}

		await this.legacyDriver_.deletePassword(name);
	}

}
