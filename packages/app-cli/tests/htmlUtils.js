/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest } = require('test-utils.js');
const htmlUtils = require('lib/htmlUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('htmlUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should extract image URLs', asyncTest(async () => {
		const testCases = [
			['<img src="http://test.com/img.png"/>', ['http://test.com/img.png']],
			['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['<img src="http://test.com/img.png" alt="testing"  >', ['http://test.com/img.png']],
			['<img src=""/> <img src="http://test.com/img2.png"/>', ['http://test.com/img2.png']],
			['nothing here', []],
			['', []],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];

			expect(htmlUtils.extractImageUrls(md).join(' ')).toBe(expected.join(' '));
		}
	}));

	it('should replace image URLs', asyncTest(async () => {
		const testCases = [
			['<img src="http://test.com/img.png"/>', ['http://other.com/img2.png'], '<img src="http://other.com/img2.png"/>'],
			['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://other.com/img2.png', 'http://other.com/img3.png'], '<img src="http://other.com/img2.png"/> <img src="http://other.com/img3.png"/>'],
			['<img src="http://test.com/img.png" alt="testing"  >', ['http://other.com/img.png'], '<img src="http://other.com/img.png" alt="testing"  >'],
		];

		const callback = (urls) => {
			let i = -1;

			return function(src) {
				i++;
				return urls[i];
			};
		};

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const r = htmlUtils.replaceImageUrls(md, callback(testCases[i][1]));
			expect(r.trim()).toBe(testCases[i][2].trim());
		}
	}));

	it('should encode attributes', asyncTest(async () => {
		const testCases = [
			[{ a: 'one', b: 'two' }, 'a="one" b="two"'],
			[{ a: 'one&two' }, 'a="one&amp;two"'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const attrs = testCases[i][0];
			const expected = testCases[i][1];
			expect(htmlUtils.attributesHtml(attrs)).toBe(expected);
		}
	}));

	it('should prepend a base URL', asyncTest(async () => {
		const testCases = [
			[
				'<a href="a.html">Something</a>',
				'http://test.com',
				'<a href="http://test.com/a.html">Something</a>',
			],
			[
				'<a href="a.html">a</a> <a href="b.html">b</a>',
				'http://test.com',
				'<a href="http://test.com/a.html">a</a> <a href="http://test.com/b.html">b</a>',
			],
			[
				'<a href="a.html">a</a> <a href="b.html">b</a>',
				'http://test.com',
				'<a href="http://test.com/a.html">a</a> <a href="http://test.com/b.html">b</a>',
			],
		];

		for (let i = 0; i < testCases.length; i++) {
			const html = testCases[i][0];
			const baseUrl = testCases[i][1];
			const expected = testCases[i][2];
			expect(htmlUtils.prependBaseUrl(html, baseUrl)).toBe(expected);
		}
	}));

});
