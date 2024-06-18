import Setting from '../../models/Setting';
import shim from '../../shim';
import { switchClient, setupDatabaseAndSynchronizer } from '../../testing/test-utils';
import KeychainService from './KeychainService';
import KeychainServiceDriver from './KeychainServiceDriver.node';

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

describe('KeychainServiceDriver.node', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('keychain.supported', 1);
		await KeychainService.instance().initialize(new KeychainServiceDriver(Setting.value('appId'), Setting.value('clientId')));
	});

	test('should migrate keys from keytar to safeStorage', async () => {
		const keytarMock = mockKeytar();

		// Set a few secure settings
		Setting.setValue('encryption.masterPassword', 'testing');
		await Setting.saveAll();

		mockSafeStorage({});

		await KeychainService.instance().runMigration(48);

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
});
