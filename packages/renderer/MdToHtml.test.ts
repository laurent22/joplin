import MdToHtml from './MdToHtml';

function newTestMdToHtml(options: any = null) {
	options = {
		ResourceModel: {
			isResourceUrl: () => false,
		},
	};

	return new MdToHtml(options);
}

describe('Rendering of (r) and (c) in published notes', () => {

	test('Should return the characters properly rendered', async () => {
		const mdToHtml = newTestMdToHtml();
		const mdToHtmlOptions: any = {
			bodyOnly: true,
		};

		// 0: input
		// 1: expected output
		const testCases = [
			[
				'# (r) and (c)', // headings
				'<h1 id="r-and-c">(r) and (c)</h1>',
			],
			[
				'(r) and (c)',
				'(r) and (c)',
			],
		];

		for (const testCase of testCases) {
			const [markdown, expectedHtml] = testCase;
			const result = await mdToHtml.render(markdown, null, mdToHtmlOptions);
			let actualHtml = result.html;

			actualHtml = actualHtml.replace(/\r?\n/g, '\n');

			if (actualHtml.trim() !== expectedHtml) {
				expect(false).toBe(true);
			} else {
				expect(true).toBe(true);
			}

		}
	});
});
