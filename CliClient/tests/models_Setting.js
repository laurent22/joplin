/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const { shim } = require('lib/shim');
const Setting = require('lib/models/Setting.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('models_Setting', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should return only sub-values', asyncTest(async () => {
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

	it('should save secure items', asyncTest(async () => {
		const originalScheduleSave = Setting.scheduleSave;
		const originalSaveSecureItem = shim.saveSecureItem;

		Setting.scheduleSave = async () => {
			Setting.saveTimeoutId_ = 123;
			await Setting.saveAll();
		};

		const mySecureItems = [];
		shim.saveSecureItem = (appId, item) => {
			mySecureItems.push(item);
		};

		const key = 'sync.5.password';
		const value = 'Test@123';

		Setting.setValue(key, value);

		expect(mySecureItems[0].key).toBe(key);
		expect(mySecureItems[0].value).toBe(value);

		Setting.scheduleSave = originalScheduleSave;
		shim.saveSecureItem = originalSaveSecureItem;
	}));

	it('should load secure items', asyncTest(async () => {
		const originalLoadSecureItems = shim.loadSecureItems;

		const key1 = 'sync.5.password';
		const key2 = 'encryption.passwordCache';
		const value1 = 'Test@123';
		const value2 = '{"123456abcdef":"Example1"}';

		shim.loadSecureItems = async (appId) => {
			return [{ key: key1, value: value1 }, { key: key2, value: value2 }];
		};
		await Setting.load();

		const loadedValue1 = Setting.value(key1);
		const loadedValue2 = JSON.stringify(Setting.value(key2));

		expect(loadedValue1).toBe(value1);
		expect(loadedValue2).toBe(value2);

		shim.loadSecureItems = originalLoadSecureItems;
	}));
});
