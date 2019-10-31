/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('markdownUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should prepend a base URL', asyncTest(async () => {
		const baseUrl = 'https://test.com/site';

		const testCases = [
			['[something](testing.html)', '[something](https://test.com/site/testing.html)'],
			['![something](/img/test.png)', '![something](https://test.com/img/test.png)'],
			['[![something](/img/test.png)](/index.html "Home page")', '[![something](https://test.com/img/test.png)](https://test.com/index.html "Home page")'],
			['[onelink.com](/jmp/?id=123&u=http://something.com/test)', '[onelink.com](https://test.com/jmp/?id=123&u=http://something.com/test)'],
			['[![some text](/img/test.png)](/jmp/?s=80&l=related&u=http://example.com "some description")', '[![some text](https://test.com/img/test.png)](https://test.com/jmp/?s=80&l=related&u=http://example.com "some description")'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];
			expect(markdownUtils.prependBaseUrl(md, baseUrl)).toBe(expected);
		}
	}));

	it('should extract image URLs', asyncTest(async () => {
		const testCases = [
			['![something](http://test.com/img.png)', ['http://test.com/img.png']],
			['![something](http://test.com/img.png) ![something2](http://test.com/img2.png)', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['![something](http://test.com/img.png "Some description")', ['http://test.com/img.png']],
			['![something](https://test.com/ohoh_(123).png)', ['https://test.com/ohoh_(123).png']],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];

			expect(markdownUtils.extractImageUrls(md).join('')).toBe(expected.join(''));
		}
	}));

});
