declare abstract class KeychainServiceDriverBase {
    private appId_;
    private clientId_;
    constructor(appId: string, clientId: string);
    get appId(): string;
    get clientId(): string;
    abstract setPassword(name: string, password: string): Promise<boolean>;
    abstract password(name: string): Promise<string>;
    abstract deletePassword(name: string): Promise<void>;
}
export default KeychainServiceDriverBase;
