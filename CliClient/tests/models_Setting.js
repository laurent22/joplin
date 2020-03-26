/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Setting = require('lib/models/Setting.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('models_Setting', function() {

	beforeEach(async (done) => {
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

	it('should save values', asyncTest(async () => {
		await setupDatabase();

		let key = 'sync.5.username';
		let value = 'testUser';
		await Setting.setValue(key, value);
		let savedValue = Setting.value(key);
		expect(savedValue).toBe(value);

		key = 'sync.5.password';
		value = 'Test$123';
		await Setting.setValue(key, value);
		savedValue = Setting.value(key);
		expect(savedValue).toBe(value);
	}));
});
