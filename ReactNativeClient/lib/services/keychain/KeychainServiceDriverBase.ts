abstract class KeychainServiceDriverBase {

	abstract get appId():string;
	abstract get clientId():string;
	abstract async setPassword(name:string, password:string):Promise<boolean>;
	abstract async password(name:string):Promise<string>;
	abstract async deletePassword(name:string):Promise<void>;

}

export default KeychainServiceDriverBase;
