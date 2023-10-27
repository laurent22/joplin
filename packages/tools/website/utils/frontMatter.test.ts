import { compileWithFrontMatter, stripOffFrontMatter } from './frontMatter';

const testCases: any[][] = [

	// =============================================================

	[
		`
---
tweet: Introducing the "GitHub Action Raw Log Viewer" extension for Chrome
forum_url: https://discourse.joplinapp.org/t/29139
---

Body
`

		,

		{
			tweet: 'Introducing the "GitHub Action Raw Log Viewer" extension for Chrome',
			forum_url: 'https://discourse.joplinapp.org/t/29139',
		},

		'Body',

		`
---
tweet: "Introducing the \\"GitHub Action Raw Log Viewer\\" extension for Chrome"
forum_url: "https://discourse.joplinapp.org/t/29139"
---

Body
`,
	],

];

describe('frontMatter', () => {

	it('should strip-off FrontMatter', async () => {
		for (const [doc, frontMatter, body, compiled] of testCases) {
			const actual = stripOffFrontMatter(doc.trim());
			expect(actual.doc).toBe(body);
			expect(actual.header).toEqual(frontMatter);

			const actualCompiled = compileWithFrontMatter(actual);
			expect(actualCompiled).toBe(compiled.trim());
		}
	});

});
