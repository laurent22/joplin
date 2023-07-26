import { plainTextToHtml } from './htmlUtils';

describe('htmlUtils', () => {

	test('should convert a plain text string to its HTML equivalent', () => {
		const testCases = [
			[
				'',
				'',
			],
			[
				'line 1\nline 2',
				'<p>line 1</p><p>line 2</p>',
			],
			[
				'line 1\n\rline 2',
				'<p>line 1</p><p>line 2</p>',
			],
			[
				'<img onerror="http://downloadmalware.com"/>',
				'&lt;img onerror=&quot;http://downloadmalware.com&quot;/&gt;',
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = plainTextToHtml(input);
			expect(actual).toBe(expected);
		}
	});

});
