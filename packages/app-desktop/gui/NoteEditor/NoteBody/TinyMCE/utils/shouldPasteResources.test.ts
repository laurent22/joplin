import shouldPasteResources from './shouldPasteResources';

describe('shouldPasteResources', () => {

	test.each([
		[
			'',
			'',
			[],
			true,
		],
		[
			'some text',
			'',
			[],
			false,
		],
		[
			'',
			'<b>some html<b>',
			[],
			false,
		],
		[
			'',
			'<img src="https://example.com/img.png"/>',
			[],
			false,
		],
		[
			'some text',
			'<img src="https://example.com/img.png"/>',
			[],
			false,
		],
		[
			'',
			'<img src="https://example.com/img.png"/><p>Some text</p>',
			[],
			false,
		],
	])('should tell if clipboard content should be processed as resources', (pastedText, pastedHtml, resourceMds, expected) => {
		const actual = shouldPasteResources(pastedText, pastedHtml, resourceMds);
		expect(actual).toBe(expected);
	});

});
