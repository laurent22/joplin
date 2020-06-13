/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const mimeUtils = require('lib/mime-utils.js').mime;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('mimeUils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should get the file extension from the mime type', asyncTest(async () => {
		expect(mimeUtils.toFileExtension('image/jpeg')).toBe('jpg');
		expect(mimeUtils.toFileExtension('image/jpg')).toBe('jpg');
		expect(mimeUtils.toFileExtension('IMAGE/JPG')).toBe('jpg');
		expect(mimeUtils.toFileExtension('')).toBe(null);
	}));

	it('should get the mime type from the filename', asyncTest(async () => {
		expect(mimeUtils.fromFilename('test.jpg')).toBe('image/jpeg');
		expect(mimeUtils.fromFilename('test.JPG')).toBe('image/jpeg');
		expect(mimeUtils.fromFilename('test.doesntexist')).toBe(null);
		expect(mimeUtils.fromFilename('test')).toBe(null);
	}));

});
