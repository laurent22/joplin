import Setting from '../../models/Setting';
import shim from '../../shim';
import { switchClient, setupDatabaseAndSynchronizer } from '../../testing/test-utils';
import KeychainService from './KeychainService';
import KeychainServiceDriverDummy from './KeychainServiceDriver.dummy';
import KeychainServiceDriverElectron from './KeychainServiceDriver.electron';
import KeychainServiceDriverNode from './KeychainServiceDriver.node';

interface SafeStorageMockOptions {
	isEncryptionAvailable?: ()=> boolean;
	encryptString?: (str: string)=> Promise<string|null>;
	decryptString?: (str: string)=> Promise<string|null>;
}

const mockSafeStorage = ({ // Safe storage
	isEncryptionAvailable = jest.fn(() => true),
	encryptString = jest.fn(async s => (`e:${s}`)),
	decryptString = jest.fn(async s => s.substring(2)),
}: SafeStorageMockOptions) => {
	shim.electronBridge = () => ({
		safeStorage: {
			isEncryptionAvailable,
			encryptString,
			decryptString,
			getSelectedStorageBackend: () => 'mock',
		},
	});
};

const mockKeytar = () => {
	const storage = new Map<string, string>();

	const keytarMock = {
		getPassword: jest.fn(async (key, client) => {
			return storage.get(`${client}--${key}`);
		}),
		setPassword: jest.fn(async (key, client, password) => {
			if (!password) throw new Error('Keytar doesn\'t support empty passwords.');
			storage.set(`${client}--${key}`, password);
		}),
		deletePassword: jest.fn(async (key, client) => {
			storage.delete(`${client}--${key}`);
		}),
	};
	shim.keytar = () => keytarMock;
	return keytarMock;
};

const makeDrivers = () => [
	new KeychainServiceDriverElectron(Setting.value('appId'), Setting.value('clientId')),
	new KeychainServiceDriverNode(Setting.value('appId'), Setting.value('clientId')),
];

describe('KeychainService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('keychain.supported', 1);
		shim.electronBridge = null;
		shim.keytar = null;
	});

	test('should migrate keys from keytar to safeStorage', async () => {
		const keytarMock = mockKeytar();
		await KeychainService.instance().initialize(makeDrivers());

		// Set a secure setting
		Setting.setValue('encryption.masterPassword', 'testing');
		await Setting.saveAll();

		mockSafeStorage({});

		await KeychainService.instance().initialize(makeDrivers());
		await Setting.load();
		expect(Setting.value('encryption.masterPassword')).toBe('testing');

		await Setting.saveAll();

		expect(keytarMock.deletePassword).toHaveBeenCalled();
		expect(keytarMock.deletePassword).toHaveBeenCalledWith(
			`${Setting.value('appId')}.setting.encryption.masterPassword`,
			`${Setting.value('clientId')}@joplin`,
		);
		expect(shim.electronBridge().safeStorage.encryptString).toHaveBeenCalled();
		expect(shim.electronBridge().safeStorage.encryptString).toHaveBeenCalledWith('testing');

		await Setting.load();
		expect(Setting.value('encryption.masterPassword')).toBe('testing');
	});

	test('should use keytar when safeStorage is unavailable', async () => {
		const keytarMock = mockKeytar();
		await KeychainService.instance().initialize(makeDrivers());

		Setting.setValue('encryption.masterPassword', 'test-password');
		await Setting.saveAll();
		expect(keytarMock.setPassword).toHaveBeenCalledWith(
			`${Setting.value('appId')}.setting.encryption.masterPassword`,
			`${Setting.value('clientId')}@joplin`,
			'test-password',
		);

		await Setting.load();
		expect(Setting.value('encryption.masterPassword')).toBe('test-password');
	});

	test('should re-check for keychain support when a new driver is added', async () => {
		mockKeytar();
		mockSafeStorage({});
		Setting.setValue('keychain.supported', -1);

		await KeychainService.instance().initialize([
			new KeychainServiceDriverDummy(Setting.value('appId'), Setting.value('clientId')),
		]);
		await KeychainService.instance().detectIfKeychainSupported();

		expect(Setting.value('keychain.supported')).toBe(0);

		// Should re-run the check after keytar and safeStorage are available.
		await KeychainService.instance().initialize(makeDrivers());
		await KeychainService.instance().detectIfKeychainSupported();
		expect(Setting.value('keychain.supported')).toBe(1);

		// Should re-run the check if safeStorage and keytar are both no longer available.
		await KeychainService.instance().initialize([]);
		await KeychainService.instance().detectIfKeychainSupported();
		expect(Setting.value('keychain.supported')).toBe(0);
	});
});
