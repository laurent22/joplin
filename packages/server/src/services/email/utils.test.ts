import { markdownBodyToHtml, markdownBodyToPlainText } from './utils';

describe('services/email/utils', () => {

	test('markdownBodyToHtml should convert URLs to clickable links', async () => {
		const testCases = [
			['Click this: [link](https://joplinapp.org)', '<p>Click this: <a href="https://joplinapp.org">link</a></p>'],
			['Click this: https://joplinapp.org', '<p>Click this: <a href="https://joplinapp.org">https://joplinapp.org</a></p>'],
		];

		for (const testCase of testCases) {
			const [input, expected] = testCase;
			const actual = markdownBodyToHtml(input);
			expect(actual.trim()).toBe(expected.trim());
		}
	});

	test('markdownBodyToPlainText should convert links to plain URLs', async () => {
		const testCases = [
			['Click this: [link](https://joplinapp.org)', 'Click this: https://joplinapp.org'],
			['Click this: https://joplinapp.org', 'Click this: https://joplinapp.org'],
		];

		for (const testCase of testCases) {
			const [input, expected] = testCase;
			const actual = markdownBodyToPlainText(input);
			expect(actual.trim()).toBe(expected.trim());
		}
	});

});
