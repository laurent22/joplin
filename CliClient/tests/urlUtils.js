require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const urlUtils = require('lib/urlUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('urlUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should prepend a base URL', async (done) => {
		expect(urlUtils.prependBaseUrl('testing.html', 'http://example.com')).toBe('http://example.com/testing.html');
		expect(urlUtils.prependBaseUrl('testing.html', 'http://example.com/')).toBe('http://example.com/testing.html');
		expect(urlUtils.prependBaseUrl('/jmp/?id=123&u=http://something.com/test', 'http://example.com/')).toBe('http://example.com/jmp/?id=123&u=http://something.com/test');
		expect(urlUtils.prependBaseUrl('/testing.html', 'http://example.com/')).toBe('http://example.com/testing.html');
		expect(urlUtils.prependBaseUrl('/testing.html', 'http://example.com/something')).toBe('http://example.com/testing.html');
		expect(urlUtils.prependBaseUrl('/testing.html', 'https://example.com/something')).toBe('https://example.com/testing.html');
		expect(urlUtils.prependBaseUrl('//somewhereelse.com/testing.html', 'https://example.com/something')).toBe('https://somewhereelse.com/testing.html');
		expect(urlUtils.prependBaseUrl('//somewhereelse.com/testing.html', 'http://example.com/something')).toBe('http://somewhereelse.com/testing.html');
		expect(urlUtils.prependBaseUrl('', 'http://example.com/something')).toBe('http://example.com/something');
		expect(urlUtils.prependBaseUrl('testing.html', '')).toBe('testing.html');

		done();
	});

});