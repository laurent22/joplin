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
			[
				'Some text indented by a tab:\n\tIndented',
				'<p>Some text indented by a tab:<br/>&nbsp;&nbsp;&nbsp;&nbsp;Indented</p>',
			],
			[
				'Some text indented by two spaces:\n  Indented',
				'<p>Some text indented by two spaces:<br/>&nbsp;&nbsp;Indented</p>',
			],
			[
				'Some text with      white space between the content\nNewLine',
				'<p>Some text with      white space between the content<br/>NewLine</p>',
			],
			[
				'Some text with \t tab\nNewLine',
				'<p>Some text with \t tab<br/>NewLine</p>',
			],
			[
				'Tab at the end of the line is ignored\t\nNewLine',
				'<p>Tab at the end of the line is ignored<br/>NewLine</p>',
			],
			[
				'White space at the end of the line is ignored       \nNewLine',
				'<p>White space at the end of the line is ignored<br/>NewLine</p>',
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = plainTextToHtml(input);
			expect(actual).toBe(expected);
		}
	});

});
