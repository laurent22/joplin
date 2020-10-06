import KeychainServiceDriverBase from './KeychainServiceDriverBase';
declare const BaseService: any;
export default class KeychainService extends BaseService {
    private driver;
    private static instance_;
    static instance(): KeychainService;
    initialize(driver: KeychainServiceDriverBase): void;
    setPassword(name: string, password: string): Promise<boolean>;
    password(name: string): Promise<string>;
    deletePassword(name: string): Promise<void>;
    detectIfKeychainSupported(): Promise<void>;
}
export {};
