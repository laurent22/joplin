require('app-module-path').addPath(__dirname);

const { asyncTest } = require('test-utils.js');
const urlUtils = require('lib/urlUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('urlUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should prepend a base URL', asyncTest(async (done) => {
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

		// It shouldn't prepend anything for these:
		expect(urlUtils.prependBaseUrl('mailto:emailme@example.com', 'http://example.com')).toBe('mailto:emailme@example.com');
		expect(urlUtils.prependBaseUrl('javascript:var%20testing=true', 'http://example.com')).toBe('javascript:var%20testing=true');
		expect(urlUtils.prependBaseUrl('http://alreadyabsolute.com', 'http://example.com')).toBe('http://alreadyabsolute.com');
		expect(urlUtils.prependBaseUrl('#local-anchor', 'http://example.com')).toBe('#local-anchor');
	}));

	it('should detect resource URLs', asyncTest(async (done) => {
		const testCases = [
			[':/1234abcd1234abcd1234abcd1234abcd', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: '' }],
			[':/1234abcd1234abcd1234abcd1234abcd "some text"', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: '' }],
			[':/1234abcd1234abcd1234abcd1234abcd#hash', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: 'hash' }],
			[':/1234abcd1234abcd1234abcd1234abcd#Книги-из-номер', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: 'Книги-из-номер' }],
			[':/1234abcd1234abcd1234abcd1234abcd#hash "some text"', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: 'hash' }],
			['joplin://1234abcd1234abcd1234abcd1234abcd', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: '' }],
			['joplin://1234abcd1234abcd1234abcd1234abcd#hash', { itemId: '1234abcd1234abcd1234abcd1234abcd', hash: 'hash' }],
			[':/1234abcd1234abcd1234abcd1234abc', null],
			['joplin://1234abcd1234abcd1234abcd1234abc', null],
		];

		for (const t of testCases) {
			const u = urlUtils.parseResourceUrl(t[0]);
			const expected = t[1];

			if (!expected) {
				expect(!u).toBe(true);
			} else {
				if (!u) {
					expect(!!u).toBe(true);
				} else {
					expect(u.itemId).toBe(expected.itemId);
					expect(u.hash).toBe(expected.hash);
				}
			}
		}
	}));

	it('should extract resource URLs', asyncTest(async (done) => {
		const testCases = [
			['Bla [](:/11111111111111111111111111111111) bla [](:/22222222222222222222222222222222) bla', ['11111111111111111111111111111111', '22222222222222222222222222222222']],
			['Bla [](:/11111111111111111111111111111111 "Some title") bla [](:/22222222222222222222222222222222 "something else") bla', ['11111111111111111111111111111111', '22222222222222222222222222222222']],
			['Bla <img src=":/fcca2938a96a22570e8eae2565bc6b0b"/> bla [](:/22222222222222222222222222222222) bla', ['fcca2938a96a22570e8eae2565bc6b0b', '22222222222222222222222222222222']],
			['Bla <img src=":/fcca2938a96a22570e8eae2565bc6b0b"/> bla <a href=":/33333333333333333333333333333333"/>Some note link</a> blu [](:/22222222222222222222222222222222) bla', ['fcca2938a96a22570e8eae2565bc6b0b', '33333333333333333333333333333333', '22222222222222222222222222222222']],
			['nothing here', []],
			['', []],
		];

		for (const t of testCases) {
			const result = urlUtils.extractResourceUrls(t[0]);
			const expected = t[1];

			const itemIds = result.map(r => r.itemId);
			expect(itemIds.sort().join(',')).toBe(expected.sort().join(','));
		}
	}));

});
