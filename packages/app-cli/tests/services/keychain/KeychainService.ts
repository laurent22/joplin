/* eslint-disable jest/require-top-level-describe */

import KeychainService from '@joplin/lib/services/keychain/KeychainService';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { db, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

function describeIfCompatible(name: string, fn: any, elseFn: any) {
	if (['win32', 'darwin'].includes(shim.platformName())) {
		return describe(name, fn);
	} else {
		elseFn();
	}
}

describeIfCompatible('services_KeychainService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1, { keychainEnabled: true });
		await switchClient(1, { keychainEnabled: true });
		await Setting.deleteKeychainPasswords();
	});

	afterEach(async () => {
		await Setting.deleteKeychainPasswords();
	});

	it('should be enabled on macOS and Windows', (async () => {
		expect(Setting.value('keychain.supported')).toBe(1);
	}));

	it('should set, get and delete passwords', (async () => {
		const service = KeychainService.instance();

		const isSet = await service.setPassword('zz_testunit', 'password');
		expect(isSet).toBe(true);

		const password = await service.password('zz_testunit');
		expect(password).toBe('password');

		await service.deletePassword('zz_testunit');

		expect(await service.password('zz_testunit')).toBe(null);
	}));

	it('should save and load secure settings', (async () => {
		Setting.setObjectValue('encryption.passwordCache', 'testing', '123456');
		await Setting.saveAll();
		await Setting.load();
		const passwords = Setting.value('encryption.passwordCache');
		expect(passwords.testing).toBe('123456');
	}));

	it('should delete db settings if they have been saved in keychain', (async () => {
		// First save some secure settings and make sure it ends up in the databse
		KeychainService.instance().enabled = false;

		Setting.setValue('sync.5.password', 'password');
		await Setting.saveAll();

		{
			// Check that it is in the database
			const row = await db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
			expect(row.value).toBe('password');
		}

		KeychainService.instance().enabled = true;

		// Change any setting to make sure a save operation is triggered
		Setting.setValue('sync.5.path', '/tmp');

		// Save the settings - now db secure keys should have been cleared and moved to keychain
		await Setting.saveAll();

		{
			// Check that it's been removed from the database
			const row = await db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
			expect(row).toBe(undefined);
		}

		// However we should still get it via the Setting class, since it will use the keychain
		expect(Setting.value('sync.5.password')).toBe('password');

		// Now do it again - because there was a bug that would cause the second attempt to save to the db instead
		Setting.setValue('sync.5.username', 'john');
		await Setting.saveAll();

		{
			// Check that it's been removed from the database
			const row = await db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
			expect(row).toBe(undefined);
		}
	}));

}, () => {

	it('will pass', () => {
		expect(true).toBe(true);
	});

});
