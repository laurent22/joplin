abstract class KeychainServiceDriverBase {

	private appId_: string;
	private clientId_: string;

	public constructor(appId: string, clientId: string) {
		this.appId_ = appId;
		this.clientId_ = clientId;
	}

	public get appId(): string {
		return this.appId_;
	}

	public get clientId(): string {
		return this.clientId_;
	}

	public abstract setPassword(name: string, password: string): Promise<boolean>;
	public abstract password(name: string): Promise<string>;
	public abstract deletePassword(name: string): Promise<void>;

}

export default KeychainServiceDriverBase;
