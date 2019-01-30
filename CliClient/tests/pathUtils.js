require('app-module-path').addPath(__dirname);

const { extractExecutablePath, quotePath, unquotePath, friendlySafeFilename } = require('lib/path-utils.js');
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
			['  no space before either', 'no space before either'],
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

	it('should quote and unquote paths', async (done) => {
		const testCases = [
			['', ''],
			['/my/path', '/my/path'],
			['/my/path with spaces', '"/my/path with spaces"'],
			['/my/weird"path', '"/my/weird\\"path"'],
			['c:\\Windows\\test.dll', 'c:\\Windows\\test.dll'],
			['c:\\Windows\\test test.dll', '"c:\\Windows\\test test.dll"'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(quotePath(t[0])).toBe(t[1]);
			expect(unquotePath(quotePath(t[0]))).toBe(t[0]);
		} 

		done();
	});

	it('should extract executable path from command', async (done) => {
		const testCases = [
			['', ''],
			['/my/cmd -some -args', '/my/cmd'],
			['"/my/cmd" -some -args', '"/my/cmd"'],
			['"/my/cmd"', '"/my/cmd"'],
			['"/my/cmd and space" -some -flags', '"/my/cmd and space"'],
			['"" -some -flags', '""'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(extractExecutablePath(t[0])).toBe(t[1]);
		} 

		done();
	});

});