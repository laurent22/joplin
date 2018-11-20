require('app-module-path').addPath(__dirname);

const { friendlySafeFilename } = require('lib/path-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('pathUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should create friendly safe filename', async (done) => {
		const testCases = [
			['生活', '生活'],
			['not/good', 'not_good'],
			['really/not/good', 'really_not_good'],
			['con', '___'],
			['no space at the end ', 'no space at the end'],
			['nor dots...', 'nor dots'],
			['thatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylong', 'thatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylong'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(friendlySafeFilename(t[0])).toBe(t[1]);
		}

		expect(!!friendlySafeFilename('')).toBe(true);
		expect(!!friendlySafeFilename('...')).toBe(true);

		done();
	});

});