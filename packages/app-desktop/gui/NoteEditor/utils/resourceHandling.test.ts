import Setting from '@joplin/lib/models/Setting';
import { processPastedHtml } from './resourceHandling';

describe('resourceHandling', () => {
	it('should sanitize pasted HTML', async () => {
		Setting.setConstant('resourceDir', '/home/.config/joplin/resources');

		const testCases = [
			['Test: <style onload="evil()"></style>', 'Test: <style></style>'],
			['<a href="javascript: alert()">test</a>', '<a href="#">test</a>'],
			['<a href="file:///home/.config/joplin/resources/test.pdf">test</a>', '<a href="file:///home/.config/joplin/resources/test.pdf">test</a>'],
			['<a href="file:///etc/passwd">evil.pdf</a>', '<a href="#">evil.pdf</a>'],
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
