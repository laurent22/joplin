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

});
