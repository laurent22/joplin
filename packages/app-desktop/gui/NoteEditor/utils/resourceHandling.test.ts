import { processPastedHtml } from './resourceHandling';

describe('resourceHandling', () => {
	it('should sanitize pasted HTML', async () => {
		const testCases = [
			['Test: <style onload="evil()"></style>', 'Test: <style></style>'],
			['<a href="javascript: alert()">test</a>', '<a href="#">test</a>'],
			['<script >evil()</script>', ''],
			['<script>evil()</script>', ''],
			[
				'<img onload="document.body.innerHTML = evil;" src="data:image/svg+xml;base64,=="/>',
				'<img src="data:image/svg+xml;base64,=="/>',
			],
		];

		for (const [html, expected] of testCases) {
			expect(await processPastedHtml(html)).toBe(expected);
		}
	});
});
