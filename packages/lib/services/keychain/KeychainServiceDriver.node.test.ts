import shim from '../../shim';
import { switchClient, setupDatabaseAndSynchronizer } from '../../testing/test-utils';
import KeychainService from './KeychainService';

interface KeychainMockOptions {
	isEncryptionAvailable?: ()=> boolean;
	encryptString?: (str: string)=> Promise<string|null>;
	decryptString?: (str: string)=> Promise<string|null>;
}

const mockKeychainModules = ({ // Safe storage
	isEncryptionAvailable = jest.fn(() => true),
	encryptString = jest.fn(async s => (`e:${s}`)),
	decryptString = jest.fn(async s => s.substring(2)),
}: KeychainMockOptions) => {
	shim.electronBridge = () => ({
		safeStorage: {
			isEncryptionAvailable,
			encryptString,
			decryptString,
		},
	});
	// TODO: Set keytar mock
};

describe('KeychainServiceDriver', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	test('should migrate keys from keytar to safeStorage', async () => {
		mockKeychainModules({});
		await KeychainService.instance().runMigration(48);
		// TODO
	});
});
