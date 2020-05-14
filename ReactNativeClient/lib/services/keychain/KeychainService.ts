import KeychainServiceDriverBase from './KeychainServiceDriverBase';
const Setting = require('lib/models/Setting');
const BaseService = require('lib/services/BaseService');

export default class KeychainService extends BaseService {

	private driver:KeychainServiceDriverBase;
	private static instance_:KeychainService;

	static instance():KeychainService {
		if (!this.instance_) this.instance_ = new KeychainService();
		return this.instance_;
	}

	initialize(driver:KeychainServiceDriverBase) {
		if (!driver.appId || !driver.clientId) throw new Error('appId and clientId must be set on the KeychainServiceDriver');
		this.driver = driver;
	}

	async setPassword(name:string, password:string):Promise<boolean> {
		return this.driver.setPassword(name, password);
	}

	async password(name:string):Promise<string> {
		return this.driver.password(name);
	}

	async deletePassword(name:string):Promise<void> {
		await this.driver.deletePassword(name);
	}

	async detectIfKeychainSupported() {
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
