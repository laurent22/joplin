import htmlUtils from './htmlUtils';

describe('htmlUtils', function() {



	it('should extract image URLs', (async () => {
		const testCases = [
			['<img src="http://test.com/img.png"/>', ['http://test.com/img.png']],
			['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['<img src="http://test.com/img.png" alt="testing"  >', ['http://test.com/img.png']],
			['<img src=""/> <img src="http://test.com/img2.png"/>', ['http://test.com/img2.png']],
			['nothing here', []],
			['', []],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0] as string;
			const expected = testCases[i][1] as string[];

			expect(htmlUtils.extractImageUrls(md).join(' ')).toBe(expected.join(' '));
		}
	}));

	it('should replace image URLs', (async () => {
		const testCases = [
			['<img src="http://test.com/img.png"/>', ['http://other.com/img2.png'], '<img src="http://other.com/img2.png"/>'],
			['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://other.com/img2.png', 'http://other.com/img3.png'], '<img src="http://other.com/img2.png"/> <img src="http://other.com/img3.png"/>'],
			['<img src="http://test.com/img.png" alt="testing"  >', ['http://other.com/img.png'], '<img src="http://other.com/img.png" alt="testing"  >'],
		];

		const callback = (urls: string[]) => {
			let i = -1;

			return function(_src: string) {
				i++;
				return urls[i];
			};
		};

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0] as string;
			const r = htmlUtils.replaceImageUrls(md, callback(testCases[i][1] as string[]));
			expect(r.trim()).toBe((testCases[i][2] as string).trim());
		}
	}));

	it('should encode attributes', (async () => {
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

	it('should prepend a base URL', (async () => {
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
