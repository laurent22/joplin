import { loadKeychainServiceAndSettings } from './SettingUtils';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import KeychainServiceDriverBase from './keychain/KeychainServiceDriverBase';
import Setting from '../models/Setting';

type MockKeychainServiceListeners = {
	onSetPassword(name: string, password: string): void;
	onGetPassword(name: string): void;
	onDeletePassword(name: string): void;
};
const makeMockKeychainServiceDriverClass = (listeners: MockKeychainServiceListeners) => {
	return class extends KeychainServiceDriverBase {
		private passwords: Map<string, string> = new Map();

		public override async setPassword(name: string, password: string) {
			listeners.onSetPassword(name, password);
			this.passwords.set(name, password);
			return true;
		}
		public override async password(name: string) {
			listeners.onGetPassword(name);
			return this.passwords.get(name);
		}
		public async deletePassword(name: string) {
			listeners.onDeletePassword(name);
			this.passwords.delete(name);
		}
	};
};

describe('SettingUtils', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});
	test('should migrate secure settings', async () => {
		const listeners: MockKeychainServiceListeners = {
			onSetPassword: jest.fn(),
			onGetPassword: jest.fn(),
			onDeletePassword: jest.fn(),
		};
		const mockKeychainServiceDriverClass = makeMockKeychainServiceDriverClass(listeners);

		Setting.setValue('encryption.masterPassword', 'test');
		Setting.setValue('keychain.needsMigration', true);
		Setting.setValue('keychain.supported', 1);
		// Settings will soon be reloaded -- save changes.
		await Setting.saveAll();

		await loadKeychainServiceAndSettings(mockKeychainServiceDriverClass);
		expect(listeners.onDeletePassword).toHaveBeenCalledWith('setting.encryption.masterPassword');
		expect(listeners.onSetPassword).toHaveBeenCalledWith('setting.encryption.masterPassword', 'test');
	});
});
