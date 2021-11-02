import Setting, { SettingSectionSource } from '../models/Setting';
import { setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow, msleep } from '../testing/test-utils';
import * as fs from 'fs-extra';
import Logger from '../Logger';

async function loadSettingsFromFile(): Promise<any> {
	return JSON.parse(await fs.readFile(Setting.settingFilePath, 'utf8'));
}

describe('models/Setting', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should return only sub-values', (async () => {
		const settings = {
			'sync.5.path': 'http://example.com',
			'sync.5.username': 'testing',
		};

		let output = Setting.subValues('sync.5', settings);
		expect(output['path']).toBe('http://example.com');
		expect(output['username']).toBe('testing');

		output = Setting.subValues('sync.4', settings);
		expect('path' in output).toBe(false);
		expect('username' in output).toBe(false);
	}));

	it('should not fail when trying to load a key that no longer exist from the setting file', (async () => {
		// To handle the case where a setting value exists in the database but
		// the metadata has been removed in a new Joplin version.
		// https://github.com/laurent22/joplin/issues/5086

		Setting.setValue('sync.target', 9); // Saved to file
		await Setting.saveAll();

		const settingValues = await Setting.fileHandler.load();
		settingValues['itsgone'] = 'myvalue';
		await Setting.fileHandler.save(settingValues);

		await Setting.reset();

		await expectNotThrow(async () => Setting.load());
		await expectThrow(async () => Setting.value('itsgone'));
	}));

	it('should allow registering new settings dynamically', (async () => {
		await expectThrow(async () => Setting.setValue('myCustom', '123'));

		await Setting.registerSetting('myCustom', {
			public: true,
			value: 'default',
			type: Setting.TYPE_STRING,
		});

		await expectNotThrow(async () => Setting.setValue('myCustom', '123'));

		expect(Setting.value('myCustom')).toBe('123');
	}));

	it('should not clear old custom settings', (async () => {
		// In general the following should work:
		//
		// - Plugin register a new setting
		// - User set new value for setting
		// - Settings are saved
		// - => App restart
		// - Plugin does not register setting again
		// - Settings are loaded
		// - Settings are saved
		// - Plugin register setting again
		// - Previous value set by user should still be there.
		//
		// In other words, once a custom setting has been set we don't clear it
		// even if registration doesn't happen immediately. That allows for example
		// to delay setting registration without a risk for the custom setting to be deleted.

		await Setting.registerSetting('myCustom', {
			public: true,
			value: 'default',
			type: Setting.TYPE_STRING,
		});

		Setting.setValue('myCustom', '123');

		await Setting.saveAll();

		await Setting.reset();

		await Setting.load();

		await Setting.registerSetting('myCustom', {
			public: true,
			value: 'default',
			type: Setting.TYPE_STRING,
		});

		await Setting.saveAll();

		expect(Setting.value('myCustom')).toBe('123');
	}));

	it('should return values with correct type for custom settings', (async () => {
		await Setting.registerSetting('myCustom', {
			public: true,
			value: 123,
			type: Setting.TYPE_INT,
		});

		Setting.setValue('myCustom', 456);

		await Setting.saveAll();
		await Setting.reset();
		await Setting.load();

		await Setting.registerSetting('myCustom', {
			public: true,
			value: 123,
			type: Setting.TYPE_INT,
		});

		expect(typeof Setting.value('myCustom')).toBe('number');
		expect(Setting.value('myCustom')).toBe(456);
	}));

	it('should validate registered keys', (async () => {
		const md = {
			public: true,
			value: 'default',
			type: Setting.TYPE_STRING,
		};

		await expectThrow(async () => await Setting.registerSetting('', md));
		await expectThrow(async () => await Setting.registerSetting('no spaces', md));
		await expectThrow(async () => await Setting.registerSetting('nospecialcharacters!!!', md));
		await expectThrow(async () => await Setting.registerSetting('Robert\'); DROP TABLE Students;--', md));

		await expectNotThrow(async () => await Setting.registerSetting('numbersareok123', md));
		await expectNotThrow(async () => await Setting.registerSetting('so-ARE-dashes_123', md));
	}));

	it('should register new sections', (async () => {
		await Setting.registerSection('mySection', SettingSectionSource.Default, {
			label: 'My section',
		});

		expect(Setting.sectionNameToLabel('mySection')).toBe('My section');
	}));

	it('should save and load settings from file', (async () => {
		Setting.setValue('sync.target', 9); // Saved to file
		Setting.setValue('encryption.passwordCache', {}); // Saved to keychain or db
		Setting.setValue('plugins.states', { test: true }); // Always saved to db
		await Setting.saveAll();

		{
			const settings = await loadSettingsFromFile();
			expect(settings['sync.target']).toBe(9);
			expect(settings).not.toContain('encryption.passwordCache');
			expect(settings).not.toContain('plugins.states');
		}

		Setting.setValue('sync.target', 8);
		await Setting.saveAll();

		{
			const settings = await loadSettingsFromFile();
			expect(settings['sync.target']).toBe(8);
		}
	}));

	it('should not save to file if nothing has changed', (async () => {
		Setting.setValue('sync.mobileWifiOnly', true);
		await Setting.saveAll();

		{
			// Double-check that timestamp is indeed changed when the content is
			// changed.
			const beforeStat = await fs.stat(Setting.settingFilePath);
			await msleep(1001);
			Setting.setValue('sync.mobileWifiOnly', false);
			await Setting.saveAll();
			const afterStat = await fs.stat(Setting.settingFilePath);
			expect(afterStat.mtime.getTime()).toBeGreaterThan(beforeStat.mtime.getTime());
		}

		{
			const beforeStat = await fs.stat(Setting.settingFilePath);
			await msleep(1001);
			Setting.setValue('sync.mobileWifiOnly', false);
			const afterStat = await fs.stat(Setting.settingFilePath);
			await Setting.saveAll();
			expect(afterStat.mtime.getTime()).toBe(beforeStat.mtime.getTime());
		}
	}));

	it('should handle invalid JSON', (async () => {
		const badContent = '{ oopsIforgotTheQuotes: true}';
		await fs.writeFile(Setting.settingFilePath, badContent, 'utf8');
		await Setting.reset();

		Logger.globalLogger.enabled = false;
		await Setting.load();
		Logger.globalLogger.enabled = true;

		// Invalid JSON file has been moved to .bak file
		expect(await fs.pathExists(Setting.settingFilePath)).toBe(false);

		const files = await fs.readdir(Setting.value('profileDir'));
		expect(files.length).toBe(1);
		expect(files[0].endsWith('.bak')).toBe(true);
		expect(await fs.readFile(`${Setting.value('profileDir')}/${files[0]}`, 'utf8')).toBe(badContent);
	}));

	it('should allow applying default migrations', (async () => {
		await Setting.reset();

		expect(Setting.value('sync.target')).toBe(0);
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(0);
		Setting.applyDefaultMigrations();
		expect(Setting.value('sync.target')).toBe(7); // Changed
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(600); // Changed
	}));

	it('should skip values that are already set', (async () => {
		await Setting.reset();

		Setting.setValue('sync.target', 9);
		Setting.applyDefaultMigrations();
		expect(Setting.value('sync.target')).toBe(9); // Not changed
	}));

	it('should allow skipping default migrations', (async () => {
		await Setting.reset();

		expect(Setting.value('sync.target')).toBe(0);
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(0);
		Setting.skipDefaultMigrations();
		Setting.applyDefaultMigrations();
		expect(Setting.value('sync.target')).toBe(0); // Not changed
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(0); // Not changed
	}));

	it('should not apply migrations that have already been applied', (async () => {
		await Setting.reset();

		Setting.setValue('lastSettingDefaultMigration', 0);
		expect(Setting.value('sync.target')).toBe(0);
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(0);
		Setting.applyDefaultMigrations();
		expect(Setting.value('sync.target')).toBe(0); // Not changed
		expect(Setting.value('style.editor.contentMaxWidth')).toBe(600); // Changed
	}));

});
