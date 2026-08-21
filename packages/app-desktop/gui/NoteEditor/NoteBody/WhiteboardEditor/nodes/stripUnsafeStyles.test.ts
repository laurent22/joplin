import stripUnsafeStyles from './stripUnsafeStyles';

describe('stripUnsafeStyles', () => {

	test.each([
		[
			'removes a style element',
			'<p>Hello</p><style>.rli-sideBar { outline: 3px solid magenta; }</style>',
			'<p>Hello</p>',
		],
		[
			'removes a style element containing a remote @import',
			'<style>@import url(http://evil.example/beacon.css);</style><p>Hi</p>',
			'<p>Hi</p>',
		],
		[
			'removes multiple style elements',
			'<style>a{}</style><p>x</p><style>b{}</style>',
			'<p>x</p>',
		],
		[
			'keeps rich card content (images, formatting, links)',
			'<p><strong>Bold</strong> <a href="https://example.com">link</a> <img src="x.png"></p>',
			'<p><strong>Bold</strong> <a href="https://example.com">link</a> <img src="x.png"></p>',
		],
		[
			'keeps inline style attributes, which cannot reach the app chrome',
			'<p style="color: red">text</p>',
			'<p style="color: red">text</p>',
		],
	])('should %s', (_label, input, expected) => {
		expect(stripUnsafeStyles(input)).toBe(expected);
	});

	test('should return empty input unchanged', () => {
		expect(stripUnsafeStyles('')).toBe('');
	});
});
