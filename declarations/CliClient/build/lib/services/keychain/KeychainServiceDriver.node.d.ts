import KeychainServiceDriverBase from './KeychainServiceDriverBase';
export default class KeychainServiceDriver extends KeychainServiceDriverBase {
    setPassword(name: string, password: string): Promise<boolean>;
    password(name: string): Promise<string>;
    deletePassword(name: string): Promise<void>;
}
