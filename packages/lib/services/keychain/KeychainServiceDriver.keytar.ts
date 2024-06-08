import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import shim from '../../shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('KeychainServiceDriver.keytar');
export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	public constructor(appId: string, clientId: string) {
		super(appId, clientId);
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (shim.keytar()) {
			logger.debug('Saving password with keytar. ID: ', name);
			await shim.keytar().setPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`, password);
		} else {
			// Unsupported.
			return false;
		}
		return true;
	}

	public async password(name: string): Promise<string> {
		if (shim.keytar()) {
			return await shim.keytar().getPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
		}

		return null;
	}

	public async deletePassword(name: string): Promise<void> {
		if (shim.keytar()) {
			logger.debug('Trying to delete password from the keychain. ID: ', name);
			await shim.keytar().deletePassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
		}
	}

}
