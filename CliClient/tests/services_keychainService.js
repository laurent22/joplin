/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const { shim } = require('lib/shim');
const Setting = require('lib/models/Setting');
const KeychainService = require('lib/services/keychain/KeychainService').default;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function describeIfCompatible(name, fn) {
	if (['win32', 'darwin'].includes(shim.platformName())) {
		return describe(name, fn);
	}
}

describeIfCompatible('services_KeychainService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1, { keychainEnabled: true });
		await switchClient(1, { keychainEnabled: true });
		await Setting.deleteKeychainPasswords();
		done();
	});

	afterEach(async (done) => {
		await Setting.deleteKeychainPasswords();
		done();
	});

	it('should be enabled on macOS and Windows', asyncTest(async () => {
		expect(Setting.value('keychain.supported')).toBe(1);
	}));

	it('should set, get and delete passwords', asyncTest(async () => {
		const service = KeychainService.instance();

		const isSet = await service.setPassword('zz_testunit', 'password');
		expect(isSet).toBe(true);

		const password = await service.password('zz_testunit');
		expect(password).toBe('password');

		await service.deletePassword('zz_testunit');

		expect(await service.password('zz_testunit')).toBe(null);
	}));

	it('should save and load secure settings', asyncTest(async () => {
		Setting.setObjectKey('encryption.passwordCache', 'testing', '123456');
		await Setting.saveAll();
		await Setting.load();
		const passwords = Setting.value('encryption.passwordCache');
		expect(passwords.testing).toBe('123456');
	}));

});
