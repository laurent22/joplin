abstract class KeychainServiceDriverBase {

	private appId_: string;
	private clientId_: string;

	constructor(appId: string, clientId: string) {
		this.appId_ = appId;
		this.clientId_ = clientId;
	}

	get appId(): string {
		return this.appId_;
	}

	get clientId(): string {
		return this.clientId_;
	}

	abstract setPassword(name: string, password: string): Promise<boolean>;
	abstract password(name: string): Promise<string>;
	abstract deletePassword(name: string): Promise<void>;

}

export default KeychainServiceDriverBase;
