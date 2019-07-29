require('app-module-path').addPath(__dirname);

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

		// It shouldn't prepend anyting for these:
		expect(urlUtils.prependBaseUrl('mailto:emailme@example.com', 'http://example.com')).toBe('mailto:emailme@example.com');
		expect(urlUtils.prependBaseUrl('javascript:var%20testing=true', 'http://example.com')).toBe('javascript:var%20testing=true');
		expect(urlUtils.prependBaseUrl('http://alreadyabsolute.com', 'http://example.com')).toBe('http://alreadyabsolute.com');
		expect(urlUtils.prependBaseUrl('#local-anchor', 'http://example.com')).toBe('#local-anchor');

		done();
	});

});
