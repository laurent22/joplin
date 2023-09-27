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
				'<p>line 1<br/>line 2</p>',
			],
			[
				'one\n\ntwo\nthree\n\nfour',
				'<p>one</p><p>two<br/>three</p><p>four</p>',
			],
			[
				'\n\n',
				'<br/><br/>',
			],
			[
				'\n\none',
				'<br/><p>one</p>',
			],
			[
				'\none\ntwo\n',
				'<p>one<br/>two</p>',
			],
			[
				'one\n\n\ntwo',
				'<p>one</p><br/><p>two</p>',
			],
			[
				'one\n\n\n\ntwo',
				'<p>one</p><br/><br/><p>two</p>',
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
