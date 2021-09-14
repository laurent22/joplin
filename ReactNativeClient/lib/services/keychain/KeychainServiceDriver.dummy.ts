import KeychainServiceDriverBase from './KeychainServiceDriverBase';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	async setPassword(/* name:string, password:string*/):Promise<boolean> {
		return false;
	}

	async password(/* name:string*/):Promise<string> {
		return null;
	}

	async deletePassword(/* name:string*/):Promise<void> {

	}

}
