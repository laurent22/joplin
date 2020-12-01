import Setting from '@joplin/lib/models/Setting';

const { setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('./test-utils.js');

describe('models_Setting', function() {

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
		await Setting.registerSection('mySection', {
			label: 'My section',
		});

		expect(Setting.sectionNameToLabel('mySection')).toBe('My section');
	}));
});
