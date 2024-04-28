import Setting, { SettingItemType, SettingSectionSource, SettingStorage } from '../models/Setting';
import { setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow, msleep } from '../testing/test-utils';
import { readFile, stat, mkdirp, writeFile, pathExists, readdir } from 'fs-extra';
import Logger from '@joplin/utils/Logger';
import { defaultProfileConfig } from '../services/profileConfig/types';
import { createNewProfile, saveProfileConfig } from '../services/profileConfig';
import initProfile from '../services/profileConfig/initProfile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function loadSettingsFromFile(): Promise<any> {
	return JSON.parse(await readFile(Setting.settingFilePath, 'utf8'));
}

const switchToSubProfileSettings = async () => {
	await Setting.reset();
	const rootProfileDir = Setting.value('profileDir');
	const profileConfigPath = `${rootProfileDir}/profiles.json`;
	let profileConfig = defaultProfileConfig();
	const { newConfig, newProfile } = createNewProfile(profileConfig, 'Sub-profile');
	profileConfig = newConfig;
	profileConfig.currentProfileId = newProfile.id;
	await saveProfileConfig(profileConfigPath, profileConfig);
	const { profileDir } = await initProfile(rootProfileDir);
	await mkdirp(profileDir);
	await Setting.load();
};

describe('models/Setting', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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
		await expectThrow(async () => Setting.value('itsgone'), 'unknown_key');
	}));

	it.each([
		SettingStorage.Database, SettingStorage.File,
	])('should allow registering new settings dynamically (storage: %d)', (async (storage) => {
		await expectThrow(async () => Setting.setValue('myCustom', '123'), 'unknown_key');

		await Setting.registerSetting('myCustom', {
			public: true,
			value: 'default',
			type: Setting.TYPE_STRING,
			storage,
		});

		expect(Setting.value('myCustom')).toBe('default');

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
			const beforeStat = await stat(Setting.settingFilePath);
			await msleep(1001);
			Setting.setValue('sync.mobileWifiOnly', false);
			await Setting.saveAll();
			const afterStat = await stat(Setting.settingFilePath);
			expect(afterStat.mtime.getTime()).toBeGreaterThan(beforeStat.mtime.getTime());
		}

		{
			const beforeStat = await stat(Setting.settingFilePath);
			await msleep(1001);
			Setting.setValue('sync.mobileWifiOnly', false);
			const afterStat = await stat(Setting.settingFilePath);
			await Setting.saveAll();
			expect(afterStat.mtime.getTime()).toBe(beforeStat.mtime.getTime());
		}
	}));

	it('should handle invalid JSON', (async () => {
		const badContent = '{ oopsIforgotTheQuotes: true}';
		await writeFile(Setting.settingFilePath, badContent, 'utf8');
		await Setting.reset();

		Logger.globalLogger.enabled = false;
		await Setting.load();
		Logger.globalLogger.enabled = true;

		// Invalid JSON file has been moved to .bak file
		expect(await pathExists(Setting.settingFilePath)).toBe(false);

		const files = await readdir(Setting.value('profileDir'));
		expect(files.length).toBe(1);
		expect(files[0].endsWith('.bak')).toBe(true);
		expect(await readFile(`${Setting.value('profileDir')}/${files[0]}`, 'utf8')).toBe(badContent);
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

	it('should migrate to new setting', (async () => {
		await Setting.reset();

		Setting.setValue('spellChecker.language', 'fr-FR');
		Setting.applyUserSettingMigration();
		expect(Setting.value('spellChecker.languages')).toStrictEqual(['fr-FR']);
	}));

	it('should not override new setting, if it already set', (async () => {
		await Setting.reset();

		Setting.setValue('spellChecker.languages', ['fr-FR', 'en-US']);
		Setting.setValue('spellChecker.language', 'fr-FR');
		Setting.applyUserSettingMigration();
		expect(Setting.value('spellChecker.languages')).toStrictEqual(['fr-FR', 'en-US']);
	}));

	it('should not set new setting, if old setting is not set', (async () => {
		await Setting.reset();

		expect(Setting.isSet('spellChecker.language')).toBe(false);
		Setting.applyUserSettingMigration();
		expect(Setting.isSet('spellChecker.languages')).toBe(false);
	}));

	it('should load sub-profile settings', async () => {
		await Setting.reset();

		await Setting.registerSetting('non_builtin', {
			public: true,
			storage: SettingStorage.File,
			isGlobal: true,
			type: SettingItemType.Bool,
			value: false,
		});

		Setting.setValue('locale', 'fr_FR'); // Global setting
		Setting.setValue('theme', Setting.THEME_DARK); // Global setting
		Setting.setValue('sync.target', 9); // Local setting
		Setting.setValue('non_builtin', true); // Local setting
		await Setting.saveAll();

		await switchToSubProfileSettings();

		expect(Setting.value('locale')).toBe('fr_FR'); // Should come from the root profile
		expect(Setting.value('theme')).toBe(Setting.THEME_DARK); // Should come from the root profile
		expect(Setting.value('sync.target')).toBe(0); // Should come from the local profile

		// Non-built-in variables are not copied
		expect(() => Setting.value('non_builtin')).toThrow();

		// Also check that the special loadOne() function works as expected

		expect((await Setting.loadOne('locale')).value).toBe('fr_FR');
		expect((await Setting.loadOne('theme')).value).toBe(Setting.THEME_DARK);
		expect((await Setting.loadOne('sync.target'))).toBe(null);
	});

	it('should save sub-profile settings', async () => {
		await Setting.reset();
		Setting.setValue('locale', 'fr_FR'); // Global setting
		Setting.setValue('theme', Setting.THEME_DARK); // Global setting
		await Setting.saveAll();

		await switchToSubProfileSettings();

		Setting.setValue('locale', 'en_GB'); // Should be saved to global
		Setting.setValue('sync.target', 8); // Should be saved to local

		await Setting.saveAll();
		await Setting.reset();
		await Setting.load();

		expect(Setting.value('locale')).toBe('en_GB');
		expect(Setting.value('theme')).toBe(Setting.THEME_DARK);
		expect(Setting.value('sync.target')).toBe(8);

		// Double-check that actual file content is correct

		const globalSettings = JSON.parse(await readFile(`${Setting.value('rootProfileDir')}/settings-1.json`, 'utf8'));
		const localSettings = JSON.parse(await readFile(`${Setting.value('profileDir')}/settings-1.json`, 'utf8'));

		expect(globalSettings).toEqual({
			'$schema': 'https://joplinapp.org/schema/settings.json',
			locale: 'en_GB',
			theme: 2,
		});

		expect(localSettings).toEqual({
			'$schema': 'https://joplinapp.org/schema/settings.json',
			'sync.target': 8,
		});
	});

	it('should not erase settings of parent profile', async () => {
		// When a sub-profile settings are saved, we should ensure that the
		// local settings of the root profiles are not lost.
		// https://github.com/laurent22/joplin/issues/6459

		await Setting.reset();

		Setting.setValue('sync.target', 9); // Local setting (Root profile)
		await Setting.saveAll();

		await switchToSubProfileSettings();

		Setting.setValue('sync.target', 2); // Local setting (Sub-profile)
		await Setting.saveAll();

		const globalSettings = JSON.parse(await readFile(`${Setting.value('rootProfileDir')}/settings-1.json`, 'utf8'));
		expect(globalSettings['sync.target']).toBe(9);
	});

	it('all global settings should be saved to file', async () => {
		for (const [k, v] of Object.entries(Setting.metadata())) {
			if (v.isGlobal && v.storage !== SettingStorage.File) throw new Error(`Setting "${k}" is global but storage is not "file"`);
		}
	});

	test('values should not be undefined when they are set', async () => {
		Setting.setValue('locale', undefined);
		expect(Setting.value('locale')).toBe('');
	});

	test('values should not be undefined when registering a setting', async () => {
		await Setting.registerSetting('myCustom', {
			public: true,
			value: undefined,
			type: Setting.TYPE_STRING,
		});

		expect(Setting.value('myCustom')).toBe('');
	});

	test('should not fail Sqlite UNIQUE constraint when re-registering saved settings', async () => {
		// Re-registering a saved database setting previously caused issues with saving.
		for (let i = 0; i < 2; i++) {
			await Setting.registerSetting('myCustom', {
				public: true,
				value: `${i}`,
				type: Setting.TYPE_STRING,
				storage: SettingStorage.Database,
			});
			Setting.setValue('myCustom', 'test');
			await Setting.saveAll();
		}
	});

});
