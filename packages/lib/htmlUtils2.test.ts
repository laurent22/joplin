import htmlUtils from './htmlUtils';
import { escapeHtml } from './string-utils';
const urlUtils = require('./urlUtils.js');

// The regexes that htmlUtils used before scanning tags in linear time
const regexes = {
	img: /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi,
	a: /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi,
	embed: /<embed([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi,
	object: /<object([\s\S]*?)data=["']([\s\S]*?)["']([\s\S]*?)>/gi,
};

const randomHtml = () => {
	const pieces = ['<img', '<IMG', '<a', '<embed', '<object', ' src=', ' SRC=', ' href=', ' data=', '"', '\'', '>', ' ', 'x', 'test.pdf', '\n', '<!--'];
	let output = '';
	const length = Math.floor(Math.random() * 30);
	for (let i = 0; i < length; i++) output += pieces[Math.floor(Math.random() * pieces.length)];
	return output;
};

describe('htmlUtils2', () => {

	it('should find the same tags as the regexes it replaces', () => {
		const toLink = (_match: string, _before: string, url: string) => `<a href="${url}!">${escapeHtml(url)}</a>`;

		for (let i = 0; i < 5000; i++) {
			const html = randomHtml();
			const urls = (regex: RegExp) => [...html.matchAll(regex)].map(m => m[2]).filter(url => !!url);

			expect(htmlUtils.extractImageUrls(html)).toEqual(urls(regexes.img));
			expect(htmlUtils.extractAnchorUrls(html)).toEqual(urls(regexes.a));
			expect(htmlUtils.extractPdfUrls(html)).toEqual([...urls(regexes.embed), ...urls(regexes.object)].filter(url => /\.pdf$/i.test(url)));
			expect(htmlUtils.processImageTags(html, ({ src }) => ({ type: 'replaceSource', src: `${src}!` })))
				.toBe(html.replace(regexes.img, (_m, before, src, after) => `<img${before}src="${src}!"${after}>`));
			expect(htmlUtils.replaceEmbedUrls(html, url => `${url}!`)).toBe(html.replace(regexes.embed, toLink).replace(regexes.object, toLink));
			expect(htmlUtils.prependBaseUrl(html, 'https://example.com'))
				.toBe(html.replace(regexes.a, (_m, before, href, after) => `<a${before}href="${urlUtils.prependBaseUrl(href, 'https://example.com')}"${after}>`));
		}
	});

	it.each([
		['images', `<p>Marker</p><!--${'<img'.repeat(1_000_000)}-->`],
		['objects', `<p>Marker</p><!--${'<object'.repeat(500_000)}-->`],
		['embeds', `<p>Marker</p><!--${'<embed'.repeat(500_000)}-->`],
		['anchors', `<p>Marker</p><!--${'<a'.repeat(1_000_000)}-->`],
		['quotes without a closing bracket', `${'<img src="x"'.repeat(250_000)}`],
	])('should process HTML with many unclosed %s quickly', (_case, html) => {
		const startTime = Date.now();
		htmlUtils.extractFileUrls(html);
		htmlUtils.extractPdfUrls(html);
		htmlUtils.replaceMediaUrls(html, url => url);
		htmlUtils.prependBaseUrl(html, 'https://example.com');
		// Takes ~5ms normally. A quadratic implementation would take minutes, so a generous limit avoids failing on a loaded CI machine.
		expect(Date.now() - startTime).toBeLessThan(10_000);
	});



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
			const attrs = testCases[i][0] as Record<string, string>;
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
