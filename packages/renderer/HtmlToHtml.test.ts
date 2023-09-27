import { splitHtml, SplittedHtml } from './HtmlToHtml';

describe('HtmlToHtml', () => {

	test('should split an HTML string into HTML and CSS', () => {
		const testCases: [string, SplittedHtml][] = [
			[
				'',
				{
					html: '',
					css: '',
				},
			],
			[
				'<style>b { font-weight: bold; }</style>\n<div>hello</div>\n<p>another line</p>',
				{
					html: '\n<div>hello</div>\n<p>another line</p>',
					css: 'b { font-weight: bold; }',
				},
			],
			[
				'<STYLE>b { font-weight: bold; }</STYLE>\n<div>hello</div>',
				{
					html: '\n<div>hello</div>',
					css: 'b { font-weight: bold; }',
				},
			],
			[
				'<html><head><STYLE>b { font-weight: bold; }</STYLE></head>\n<div>hello</div>',
				{
					html: '<html><head><STYLE>b { font-weight: bold; }</STYLE></head>\n<div>hello</div>',
					css: '',
				},
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = splitHtml(input);
			expect(actual).toEqual(expected);
		}
	});

});
