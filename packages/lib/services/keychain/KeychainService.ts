import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import Setting from '../../models/Setting';
import BaseService from '../BaseService';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('KeychainService');

export default class KeychainService extends BaseService {

	private drivers_: KeychainServiceDriverBase[];
	private keysNeedingMigration_: Set<string>;
	private static instance_: KeychainService;
	private enabled_ = true;
	private readOnly_ = false;

	public static instance(): KeychainService {
		if (!this.instance_) this.instance_ = new KeychainService();
		return this.instance_;
	}

	// The drivers list should be provided in order of preference, with the most preferred driver
	// first. If not present in the first supported driver, the keychain service will attempt to
	// migrate keys to it.
	public async initialize(drivers: KeychainServiceDriverBase[]) {
		if (drivers.some(driver => !driver.appId || !driver.clientId)) {
			throw new Error('appId and clientId must be set on the KeychainServiceDriver');
		}

		this.drivers_ = [];
		this.keysNeedingMigration_ = new Set();
		for (const driver of drivers) {
			if (await driver.supported()) {
				this.drivers_.push(driver);
			} else {
				logger.info(`Driver unsupported:${driver.driverId}`);
			}
		}
	}

	// This is to programatically disable the keychain service, whether keychain
	// is supported or not in the system (In other word, this be might "enabled"
	// but nothing will be saved to the keychain if there isn't one).
	public get enabled(): boolean {
		if (!this.enabled_) return false;

		// Otherwise we assume it's enabled if "keychain.supported" is either -1
		// (undetermined) or 1 (working). We make it work for -1 too because the
		// setPassword() and password() functions need to work to test if the
		// keychain is supported (in detectIfKeychainSupported).
		return Setting.value('keychain.supported') !== 0;
	}

	public set enabled(v: boolean) {
		this.enabled_ = v;
	}

	public get readOnly() {
		return this.readOnly_;
	}

	public set readOnly(v: boolean) {
		this.readOnly_ = v;
	}

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (!this.enabled) return false;
		if (this.readOnly_) return false;

		// Optimization: Handles the case where the password doesn't need to change.
		// TODO: Re-evaluate whether this optimization is necessary after refactoring the driver
		//       logic.
		if (!this.keysNeedingMigration_.has(name) && await this.password(name) === password) {
			return true;
		}

		// Due to a bug in macOS, this may throw an exception "The user name or passphrase you entered is not correct."
		// The fix is to open Keychain Access.app. Right-click on the login keychain and try locking it and then unlocking it again.
		// https://github.com/atom/node-keytar/issues/76
		let i = 0;
		let didSet = false;
		for (; i < this.drivers_.length && !didSet; i++) {
			didSet = await this.drivers_[i].setPassword(name, password);
		}

		if (didSet && this.keysNeedingMigration_.has(name)) {
			logger.info(`Marking key ${name} as copied to new keychain backend...`);

			// At this point, the key has been saved in drivers[i - 1].
			//
			// Deleting the key from the less-preferred drivers would complete the
			// migration. However, to allow users to roll back to a previous Joplin
			// version without data loss, avoid deleting old keys here.

			this.keysNeedingMigration_.delete(name);
		}

		return didSet;
	}

	public async password(name: string): Promise<string> {
		if (!this.enabled) return null;

		let foundInPreferredDriver = true;
		let password: string|null = null;
		for (const driver of this.drivers_) {
			password = await driver.password(name);
			if (password) {
				break;
			}
			foundInPreferredDriver = false;
		}

		if (password && !foundInPreferredDriver) {
			this.keysNeedingMigration_.add(name);
		}

		return password;
	}

	public async deletePassword(name: string): Promise<void> {
		if (!this.enabled) return;

		for (const driver of this.drivers_) {
			await driver.deletePassword(name);
		}
	}

	public async detectIfKeychainSupported() {
		this.logger().info('KeychainService: checking if keychain supported');

		const lastAvailableDrivers = Setting.value('keychain.lastAvailableDrivers');
		const availableDriversChanged = (() => {
			if (lastAvailableDrivers.length !== this.drivers_.length) return true;
			return this.drivers_.some(driver => {
				return !lastAvailableDrivers.includes(driver.driverId);
			});
		})();

		const checkAlreadyDone = Setting.value('keychain.supported') >= 0;
		if (checkAlreadyDone && !availableDriversChanged) {
			this.logger().info('KeychainService: check was already done - skipping. Supported:', Setting.value('keychain.supported'));
			return;
		}

		if (availableDriversChanged) {
			// Reset supported -- this allows the test .setPassword to work.
			Setting.setValue('keychain.supported', -1);
		}

		if (!this.readOnly) {
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
		} else {
			// The supported check requires write access to the keychain -- rely on the more
			// limited support checks done by each driver.
			const supported = this.drivers_.length > 0;
			Setting.setValue('keychain.supported', supported ? 1 : 0);

			if (supported) {
				logger.info('Starting KeychainService in read-only mode. Keys will be read, but not written.');
			} else {
				logger.info('Failed to start in read-only mode -- no supported drivers found.');
			}
		}
		Setting.setValue('keychain.lastAvailableDrivers', this.drivers_.map(driver => driver.driverId));
	}
}
