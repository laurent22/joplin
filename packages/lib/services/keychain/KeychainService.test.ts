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
	isEncryptionAvailable = () => true,
	encryptString = async s => (`e:${s}`),
	decryptString = async (s) => s.substring(2),
}: SafeStorageMockOptions) => {
	const mock = {
		isEncryptionAvailable: jest.fn(isEncryptionAvailable),
		encryptString: jest.fn(encryptString),
		decryptString: jest.fn(decryptString),
		getSelectedStorageBackend: jest.fn(() => 'mock'),
	};
	shim.electronBridge = () => ({
		safeStorage: mock,
	});

	return mock;
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

const testSaveLoadSecureSetting = async (expectedPassword: string) => {
	Setting.setValue('encryption.masterPassword', expectedPassword);
	await Setting.saveAll();

	await Setting.load();
	expect(Setting.value('encryption.masterPassword')).toBe(expectedPassword);
};

describe('KeychainService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		KeychainService.instance().readOnly = false;
		Setting.setValue('keychain.supported', 1);
		shim.electronBridge = null;
		shim.keytar = null;
	});

	test('should copy keys from keytar to safeStorage', async () => {
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

		// For now, passwords should not be removed from old backends -- this allows
		// users to revert to an earlier version of Joplin without data loss.
		expect(keytarMock.deletePassword).not.toHaveBeenCalled();

		expect(shim.electronBridge().safeStorage.encryptString).toHaveBeenCalled();
		expect(shim.electronBridge().safeStorage.encryptString).toHaveBeenCalledWith('testing');

		await Setting.load();
		expect(Setting.value('encryption.masterPassword')).toBe('testing');
	});

	test('should use keytar when safeStorage is unavailable', async () => {
		const keytarMock = mockKeytar();
		await KeychainService.instance().initialize(makeDrivers());

		await testSaveLoadSecureSetting('test-password');
		expect(keytarMock.setPassword).toHaveBeenCalledWith(
			`${Setting.value('appId')}.setting.encryption.masterPassword`,
			`${Setting.value('clientId')}@joplin`,
			'test-password',
		);
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

	test('should load settings from a read-only KeychainService if not present in the database', async () => {
		mockSafeStorage({});

		const service = KeychainService.instance();
		await service.initialize(makeDrivers());
		expect(await service.setPassword('setting.encryption.masterPassword', 'keychain password')).toBe(true);

		service.readOnly = true;
		await service.initialize(makeDrivers());
		await Setting.load();

		expect(Setting.value('encryption.masterPassword')).toBe('keychain password');
	});

	test('settings should be saved to database with a read-only keychain', async () => {
		const safeStorage = mockSafeStorage({});

		const service = KeychainService.instance();
		service.readOnly = true;

		await service.initialize(makeDrivers());
		await service.detectIfKeychainSupported();

		expect(Setting.value('keychain.supported')).toBe(1);
		await testSaveLoadSecureSetting('testing...');

		expect(safeStorage.encryptString).not.toHaveBeenCalledWith('testing...');
	});

	test('loading settings with a read-only keychain should prefer the database', async () => {
		const safeStorage = mockSafeStorage({});

		const service = KeychainService.instance();
		await service.initialize(makeDrivers());
		// Set an initial value
		expect(await service.setPassword('setting.encryption.masterPassword', 'test keychain password')).toBe(true);

		service.readOnly = true;
		await service.initialize(makeDrivers());

		safeStorage.encryptString.mockClear();

		Setting.setValue('encryption.masterPassword', 'test database password');
		await Setting.saveAll();

		await Setting.load();
		expect(Setting.value('encryption.masterPassword')).toBe('test database password');
		expect(await service.password('setting.encryption.masterPassword')).toBe('test keychain password');

		// Should not have attempted to encrypt settings in read-only mode.
		expect(safeStorage.encryptString).not.toHaveBeenCalled();
	});
});
