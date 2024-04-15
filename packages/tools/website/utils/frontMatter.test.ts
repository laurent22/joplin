import { compileWithFrontMatter, stripOffFrontMatter } from './frontMatter';
const moment = require('moment');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const testCases: any[][] = [

	// =============================================================

	[
		`
---
tweet: Introducing the "GitHub Action Raw Log Viewer" extension for Chrome
forum_url: https://discourse.joplinapp.org/t/29139
created: 2019-09-29T14:28:34.000+00:00
updated: 2019-09-29T14:30:50.000+00:00
---

Body
`

		,

		{
			tweet: 'Introducing the "GitHub Action Raw Log Viewer" extension for Chrome',
			forum_url: 'https://discourse.joplinapp.org/t/29139',
			created: moment('2019-09-29T14:28:34.000+00:00').toDate(),
			updated: moment('2019-09-29T14:30:50.000+00:00').toDate(),
		},

		'Body',

		`
---
tweet: Introducing the "GitHub Action Raw Log Viewer" extension for Chrome
forum_url: https://discourse.joplinapp.org/t/29139
created: 2019-09-29T14:28:34.000Z
updated: 2019-09-29T14:30:50.000Z
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
