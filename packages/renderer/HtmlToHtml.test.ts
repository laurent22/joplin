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
			// cSpell:disable
			[
				`<style></style>
<p><br></p><div class="moz-forward-container"><br><br>-------- Message transféré --------<table class="moz-email-headers-table" cellspacing="0" cellpadding="0" border="0"><tbody><tr><th valign="BASELINE" nowrap="nowrap" align="RIGHT">Sujet&nbsp;:</th><td>
Your car rental booking DC-7706328 is confirmed (pick-up on 1 October 2024)</td></tr></tbody></table><style type="text/css"></style>`,
				{
					html: `
<p><br></p><div class="moz-forward-container"><br><br>-------- Message transféré --------<table class="moz-email-headers-table" cellspacing="0" cellpadding="0" border="0"><tbody><tr><th valign="BASELINE" nowrap="nowrap" align="RIGHT">Sujet&nbsp;:</th><td>
Your car rental booking DC-7706328 is confirmed (pick-up on 1 October 2024)</td></tr></tbody></table><style type="text/css"></style>`,
					css: '',
				},
			],
			// cSpell:enable
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = splitHtml(input);
			expect(actual).toEqual(expected);
		}
	});

});
