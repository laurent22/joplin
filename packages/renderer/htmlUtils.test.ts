import htmlUtils, { extractHtmlBody, htmlDocIsImageOnly, ProcessAnchorTagsAction, removeWrappingParagraphAndTrailingEmptyElements } from './htmlUtils';

describe('htmlUtils', () => {

	test('should strip off HTML', () => {
		const testCases = [
			[
				'',
				'',
			],
			[
				'<b>test</b>',
				'test',
			],
			[
				'Joplin&circledR;',
				'Joplin®',
			],
			[
				'&lt;b&gttest&lt;/b&gt',
				'&lt;b>test&lt;/b>',
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = htmlUtils.stripHtml(input);
			expect(actual).toBe(expected);
		}
	});

	test('should extract the HTML body', () => {
		const testCases: [string, string][] = [
			[
				'Just <b>testing</b>',
				'Just <b>testing</b>',
			],
			[
				'',
				'',
			],
			[
				'<html><head></head><meta bla><body>Here is the body<img src="test.png"/></body></html>',
				'Here is the body<img src="test.png"/>',
			],
		];

		for (const [input, expected] of testCases) {
			const actual = extractHtmlBody(input);
			expect(actual).toBe(expected);
		}
	});

	test('should tell if an HTML document is an image only', () => {
		const testCases: [string, boolean][] = [
			[
				// This is the kind of HTML that's pasted when copying an image from Chrome
				'<meta charset=\'utf-8\'>\n<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'',
				false,
			],
			[
				'<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'<img src="https://example.com/img.png"/><img src="https://example.com/img.png"/>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/><p>Some text</p>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/> Some text',
				false,
			],
		];

		for (const [input, expected] of testCases) {
			const actual = htmlDocIsImageOnly(input);
			expect(actual).toBe(expected);
		}
	});

	it.each([
		['<p>Test</p><div></div>', 'Test'],
		['<p>Testing</p><p>A test</p>', '<p>Testing</p><p>A test</p>'],
		['<p>Testing</p><hr/>', '<p>Testing</p><hr/>'],
		['<p>Testing</p><div style="border: 2px solid red;"></div>', '<p>Testing</p><div style="border: 2px solid red;"></div>'],
		['<p>Testing</p><style onload=""></style>', 'Testing'],
		['<p>is</p>\n<style onload="console.log(\'test\')"></style>', 'is\n'],
	])('should remove empty elements (case %#)', (before, expected) => {
		expect(removeWrappingParagraphAndTrailingEmptyElements(before)).toBe(expected);
	});

	it.each([
		[':/0123456789abcdef0123456789abcdef', true],
		[':/0123456789abcdef0123456789abcdef/anchor', true],
		['javascript:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/;alert(1)', false],
		['data:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/;alert(1)', false],
		['vbscript:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', false],
		[':/short', false],
	])('should only allow resource-style URLs anchored to the start (input: %s)', (href, shouldKeep) => {
		const output = htmlUtils.sanitizeHtml(`<a href="${href}">Click</a>`);
		if (shouldKeep) {
			expect(output).toContain(`href="${href}"`);
		} else {
			expect(output).not.toContain(`href="${href}"`);
			expect(output).toContain('href="#"');
		}
	});

	it.each([
		{
			label: 'should replace anchor href attributes',
			input: '<a>test <a href="href-1"></a></a><div><a href="href-1">another</a></div>',
			mapper: (): ProcessAnchorTagsAction => (
				{ type: 'replaceSource', href: 'updated' }
			),
			expected: '<a href="updated">test <a href="updated"></a></a><div><a href="updated">another</a></div>',
		},
		{
			label: 'should replace full anchor opening tags',
			input: '<a>test</a>',
			mapper: (): ProcessAnchorTagsAction => (
				{ type: 'replaceElement', html: '<a data-test>' }
			),
			expected: '<a data-test>test</a>',
		},
		{
			label: 'should preserve comments',
			input: '<a>test <a href="href-1"><!-- test --></a></a><!-- Test! -->',
			mapper: (): null => null,
			expected: '<a>test <a href="href-1"><!-- test --></a></a><!-- Test! -->',
		},
		{
			label: 'should gracefully handle unbalanced tags',
			input: '<div><a>test <a href="href-1"> test</a></span>',
			mapper: (): null => null,
			expected: '<div><a>test <a href="href-1"> test</a>',
		},
		{
			label: 'should escape "s and >s in attribute names',
			input: '<a data-test=">&gt;">Test</a>',
			mapper: (): ProcessAnchorTagsAction => (
				{ type: 'replaceSource', href: '">' }
			),
			expected: '<a data-test="&gt;&gt;" href="&quot;&gt;">Test</a>',
		},
	])('should replace anchor tags: $label', ({ input, mapper, expected }) => {
		expect(htmlUtils.processAnchorTags(input, mapper)).toBe(expected);
	});
});
