import KeychainServiceDriverBase from './KeychainServiceDriverBase';
export default class KeychainServiceDriver extends KeychainServiceDriverBase {
    setPassword(): Promise<boolean>;
    password(): Promise<string>;
    deletePassword(): Promise<void>;
}
