import KeychainServiceDriverBase from './KeychainServiceDriverBase';
const Setting = require('../../models/Setting').default;
const BaseService = require('../BaseService').default;

export default class KeychainService extends BaseService {

	private driver: KeychainServiceDriverBase;
	private static instance_: KeychainService;
	private enabled_: boolean = true;

	static instance(): KeychainService {
		if (!this.instance_) this.instance_ = new KeychainService();
		return this.instance_;
	}

	public initialize(driver: KeychainServiceDriverBase) {
		if (!driver.appId || !driver.clientId) throw new Error('appId and clientId must be set on the KeychainServiceDriver');
		this.driver = driver;
	}

	// This is to programatically disable the keychain service, regardless whether keychain
	// is supported or not in the system (In other word, this might "enabled" but nothing
	// will be saved to the keychain if there isn't one).
	public get enabled(): boolean {
		return this.enabled_;
	}

	public set enabled(v: boolean) {
		this.enabled_ = v;
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (!this.enabled) return false;

		// Due to a bug in macOS, this may throw an exception "The user name or passphrase you entered is not correct."
		// The fix is to open Keychain Access.app. Right-click on the login keychain and try locking it and then unlocking it again.
		// https://github.com/atom/node-keytar/issues/76
		return this.driver.setPassword(name, password);
	}

	public async password(name: string): Promise<string> {
		if (!this.enabled) return null;

		return this.driver.password(name);
	}

	public async deletePassword(name: string): Promise<void> {
		if (!this.enabled) return;

		await this.driver.deletePassword(name);
	}

	public async detectIfKeychainSupported() {
		this.logger().info('KeychainService: checking if keychain supported');

		if (Setting.value('keychain.supported') >= 0) {
			this.logger().info('KeychainService: check was already done - skipping. Supported:', Setting.value('keychain.supported'));
			return;
		}

		const passwordIsSet = await this.setPassword('zz_testingkeychain', 'mytest');

		if (!passwordIsSet) {
			this.logger().info('KeychainService: could not set test password - keychain support will be disabled');
			Setting.setValue('keychain.supported', 0);
		} else {
			const result = await this.password('zz_testingkeychain');
			await this.deletePassword('zz_testingkeychain');
			this.logger().info('KeychainService: tried to set and get password. Result was:', result);
			Setting.setValue('keychain.supported', result === 'mytest' ? 1 : 0);
		}
	}

}
