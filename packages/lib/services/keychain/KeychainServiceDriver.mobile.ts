import KeychainServiceDriverBase from './KeychainServiceDriverBase';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	public async setPassword(/* name:string, password:string*/): Promise<boolean> {
		return false;
	}

	public async password(/* name:string*/): Promise<string> {
		return null;
	}

	public async deletePassword(/* name:string*/): Promise<void> {

	}

}
