import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import shim from '../../shim';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {
	public override readonly driverId: string = 'node-keytar';

	public async supported(): Promise<boolean> {
		return !!shim.keytar?.();
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		await shim.keytar().setPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`, password);
		return true;
	}

	public async password(name: string): Promise<string> {
		return shim.keytar().getPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
	}

	public async deletePassword(name: string): Promise<void> {
		await shim.keytar().deletePassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
	}

}
